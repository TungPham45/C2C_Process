import { request as httpRequest, type IncomingHttpHeaders, type OutgoingHttpHeaders } from 'http';
import { request as httpsRequest } from 'https';
import { pipeline } from 'stream';
import { URL, URLSearchParams } from 'url';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

export function createReverseProxy(target: string): RequestHandler {
  const upstreamBase = new URL(target);

  return (req: Request, res: Response, next: NextFunction) => {
    const upstreamUrl = buildUpstreamUrl(upstreamBase, req.url);
    const requestBody = getRequestBody(req);
    const headers = buildRequestHeaders(req.headers, upstreamUrl, requestBody);
    const requestFn = upstreamUrl.protocol === 'https:' ? httpsRequest : httpRequest;

    const proxyReq = requestFn(
      {
        protocol: upstreamUrl.protocol,
        hostname: upstreamUrl.hostname,
        port: upstreamUrl.port || undefined,
        method: req.method,
        path: `${upstreamUrl.pathname}${upstreamUrl.search}`,
        headers,
      },
      (proxyRes) => {
        if (proxyRes.statusCode) {
          res.status(proxyRes.statusCode);
        }

        if (proxyRes.statusMessage) {
          res.statusMessage = proxyRes.statusMessage;
        }

        applyResponseHeaders(proxyRes.headers, res);

        pipeline(proxyRes, res, (error) => {
          if (error && !res.destroyed) {
            res.destroy(error);
          }
        });
      },
    );

    proxyReq.on('error', (error) => {
      if (res.headersSent) {
        if (!res.destroyed) {
          res.destroy(error);
        }
        return;
      }

      res.status(502).json({ message: 'Bad gateway' });
    });

    if (requestBody === undefined) {
      pipeline(req, proxyReq, (error) => {
        if (error && !proxyReq.destroyed) {
          proxyReq.destroy(error);
        }
      });
      return;
    }

    if (requestBody === null) {
      proxyReq.end();
      return;
    }

    proxyReq.end(requestBody);
  };
}

function buildUpstreamUrl(baseUrl: URL, requestUrl: string): URL {
  const relativeUrl = new URL(requestUrl, 'http://localhost');
  const upstreamUrl = new URL(baseUrl.toString());

  upstreamUrl.pathname = joinUrlPaths(baseUrl.pathname, relativeUrl.pathname);
  upstreamUrl.search = relativeUrl.search;

  return upstreamUrl;
}

function joinUrlPaths(basePath: string, requestPath: string): string {
  const normalizedBase = basePath.replace(/\/+$/, '');
  const normalizedRequest = requestPath.replace(/^\/+/, '');
  const joinedPath = [normalizedBase, normalizedRequest].filter(Boolean).join('/');

  return joinedPath.startsWith('/') ? joinedPath : `/${joinedPath}`;
}

function buildRequestHeaders(
  headers: IncomingHttpHeaders,
  upstreamUrl: URL,
  requestBody: Buffer | null | undefined,
): OutgoingHttpHeaders {
  const outgoingHeaders: OutgoingHttpHeaders = {};

  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || HOP_BY_HOP_HEADERS.has(name.toLowerCase()) || name.toLowerCase() === 'host') {
      continue;
    }

    outgoingHeaders[name] = value;
  }

  outgoingHeaders.host = upstreamUrl.host;

  if (requestBody === undefined) {
    return outgoingHeaders;
  }

  delete outgoingHeaders['content-length'];
  delete outgoingHeaders['transfer-encoding'];

  if (requestBody === null) {
    return outgoingHeaders;
  }

  outgoingHeaders['content-length'] = Buffer.byteLength(requestBody);

  if (!outgoingHeaders['content-type']) {
    outgoingHeaders['content-type'] = 'application/json; charset=utf-8';
  }

  return outgoingHeaders;
}

function applyResponseHeaders(headers: IncomingHttpHeaders, res: Response): void {
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || HOP_BY_HOP_HEADERS.has(name.toLowerCase())) {
      continue;
    }

    res.setHeader(name, value);
  }
}

function getRequestBody(req: Request): Buffer | null | undefined {
  if (!methodCanHaveBody(req.method)) {
    return null;
  }

  const contentType = normalizeHeaderValue(req.headers['content-type']);

  // multipart/form-data (file upload): Express đã consume stream khi parse body.
  // Phải pipe raw stream qua proxy (trả undefined để trigger pipeline(req, proxyReq)).
  if (contentType.includes('multipart/form-data')) {
    return undefined;
  }

  if (typeof req.body === 'undefined') {
    return undefined;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body.length > 0 ? req.body : null;
  }

  if (typeof req.body === 'string') {
    return req.body.length > 0 ? Buffer.from(req.body) : null;
  }

  if (req.body == null) {
    return null;
  }

  if (isEmptyObject(req.body) && declaredContentLength(req.headers['content-length']) === 0) {
    return null;
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Buffer.from(toUrlEncodedBody(req.body));
  }

  if (contentType.includes('text/plain')) {
    return Buffer.from(String(req.body));
  }

  return Buffer.from(JSON.stringify(req.body));
}

function methodCanHaveBody(method: string): boolean {
  return !['GET', 'HEAD'].includes(method.toUpperCase());
}

function declaredContentLength(value: string | string[] | undefined): number | undefined {
  const normalizedValue = normalizeHeaderValue(value);
  if (!normalizedValue) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function normalizeHeaderValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.join(',') : value ?? '';
}

function isEmptyObject(value: unknown): value is Record<string, never> {
  return typeof value === 'object' && value !== null && Object.keys(value).length === 0;
}

function toUrlEncodedBody(body: Record<string, unknown>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(body)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
      continue;
    }

    if (typeof value === 'undefined') {
      continue;
    }

    params.append(key, String(value));
  }

  return params.toString();
}
