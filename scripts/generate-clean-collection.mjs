import fs from 'fs';

const templatePath = './scripts/Single Test.postman_collection.json';
const outputPath = './c2c-login-e2e.postman_collection.json';
const accountOutputPath = './c2c-account-management-e2e.postman_collection.json';

function buildCollection() {
  if (!fs.existsSync(templatePath)) {
    console.error('Template not found at', templatePath);
    return;
  }

  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

  // Request Definitions
  const reqAdminLogin = {
    name: "Admin Login (Get Admin Token)",
    event: [
      {
        listen: "test",
        script: {
          exec: [
            "pm.test(\"Status code is 200 or 201\", function () {",
            "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
            "});",
            "",
            "pm.test(\"Admin access token is returned\", function () {",
            "    var jsonData = pm.response.json();",
            "    pm.expect(jsonData.access_token).to.not.be.undefined;",
            "    pm.collectionVariables.set(\"admin_token\", jsonData.access_token);",
            "});"
          ],
          type: "text/javascript",
          packages: {}
        }
      }
    ],
    request: {
      auth: { type: "noauth" },
      method: "POST",
      header: [],
      body: {
        mode: "raw",
        raw: "{\n    \"email\": \"admin@gmail.com\",\n    \"password\": \"123456\"\n}",
        options: { raw: { language: "json" } }
      },
      url: {
        raw: "{{gateway_url}}/api/auth/login",
        host: ["{{gateway_url}}"],
        path: ["api", "auth", "login"]
      },
      description: "Log in as administrator to get access token."
    },
    response: []
  };

  const reqGetUsers = {
    name: "Get Users (Identify Buyer ID)",
    event: [
      {
        listen: "test",
        script: {
          exec: [
            "pm.test(\"Status code is 200\", function () {",
            "    pm.response.to.have.status(200);",
            "});",
            "",
            "pm.test(\"Identify buyer@gmail.com ID\", function () {",
            "    var jsonData = pm.response.json();",
            "    pm.expect(jsonData).to.be.an(\"array\");",
            "    var buyer = jsonData.find(function(u) { return u.email === \"buyer@gmail.com\"; });",
            "    pm.expect(buyer).to.not.be.undefined;",
            "    pm.collectionVariables.set(\"buyer_id\", buyer.id);",
            "});"
          ],
          type: "text/javascript",
          packages: {}
        }
      }
    ],
    request: {
      auth: { type: "noauth" },
      method: "GET",
      header: [
        {
          key: "Authorization",
          value: "Bearer {{admin_token}}"
        }
      ],
      url: {
        raw: "{{gateway_url}}/api/admin/users",
        host: ["{{gateway_url}}"],
        path: ["api", "admin", "users"]
      },
      description: "Retrieve users and save the buyer user ID."
    },
    response: []
  };

  const reqLockBuyer = {
    name: "Lock/Suspend Buyer Account",
    event: [
      {
        listen: "test",
        script: {
          exec: [
            "pm.test(\"Status code is 200\", function () {",
            "    pm.response.to.have.status(200);",
            "});"
          ],
          type: "text/javascript",
          packages: {}
        }
      }
    ],
    request: {
      auth: { type: "noauth" },
      method: "PUT",
      header: [
        {
          key: "Authorization",
          value: "Bearer {{admin_token}}"
        }
      ],
      body: {
        mode: "raw",
        raw: "{\n    \"status\": \"suspended\"\n}",
        options: { raw: { language: "json" } }
      },
      url: {
        raw: "{{gateway_url}}/api/admin/users/{{buyer_id}}/status",
        host: ["{{gateway_url}}"],
        path: ["api", "admin", "users", "{{buyer_id}}", "status"]
      },
      description: "Suspend buyer account using admin token."
    },
    response: []
  };

  const reqUnlockBuyer = {
    name: "Unlock/Reactivate Buyer Account",
    event: [
      {
        listen: "test",
        script: {
          exec: [
            "pm.test(\"Status code is 200\", function () {",
            "    pm.response.to.have.status(200);",
            "});"
          ],
          type: "text/javascript",
          packages: {}
        }
      }
    ],
    request: {
      auth: { type: "noauth" },
      method: "PUT",
      header: [
        {
          key: "Authorization",
          value: "Bearer {{admin_token}}"
        }
      ],
      body: {
        mode: "raw",
        raw: "{\n    \"status\": \"active\"\n}",
        options: { raw: { language: "json" } }
      },
      url: {
        raw: "{{gateway_url}}/api/admin/users/{{buyer_id}}/status",
        host: ["{{gateway_url}}"],
        path: ["api", "admin", "users", "{{buyer_id}}", "status"]
      },
      description: "Activate suspended user account."
    },
    response: []
  };

  const newCollection = {
    info: {
      _postman_id: "8fb29df7-7090-4828-98e3-47a3297a7a10",
      name: "C2C Platform - Login & Auth E2E Test",
      description: "Comprehensive End-to-End API test suite structured into separate functional flows for checking logins, credentials validation, user block/unblock status, registration activation via OTP, and password reset flows on C2C Platform.",
      schema: template.info.schema,
      _exporter_id: template.info._exporter_id
    },
    item: [
      {
        name: "LUỒNG 1: Đăng nhập cơ bản & Kiểm tra hợp lệ (Basic Login Validations)",
        description: "Verify login functionality for active accounts and validation rules for invalid, non-existent, or empty credentials.",
        item: [
          {
            name: "1. Login: Valid Buyer Account",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 200 or 201\", function () {",
                    "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                    "});",
                    "",
                    "pm.test(\"Buyer token is returned\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.access_token).to.not.be.undefined;",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"buyer@gmail.com\",\n    \"password\": \"123456\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/login",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "login"]
              },
              description: "Verify login succeeds with valid buyer credentials."
            },
            response: []
          },
          {
            name: "2. Login: Incorrect Password",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 401 Unauthorized\", function () {",
                    "    pm.response.to.have.status(401);",
                    "});",
                    "",
                    "pm.test(\"Error message is correct\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.message).to.equal(\"Mật khẩu không chính xác\");",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"buyer@gmail.com\",\n    \"password\": \"wrongpassword\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/login",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "login"]
              },
              description: "Verify login fails with incorrect password."
            },
            response: []
          },
          {
            name: "3. Login: Non-existent Email",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 401 Unauthorized\", function () {",
                    "    pm.response.to.have.status(401);",
                    "});",
                    "",
                    "pm.test(\"Error message is correct\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.message).to.equal(\"Email không tồn tại trên hệ thống\");",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"nonexistent@gmail.com\",\n    \"password\": \"123456\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/login",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "login"]
              },
              description: "Verify login fails with a non-existent email."
            },
            response: []
          },
          {
            name: "4. Login: Invalid Email Format",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 400 Bad Request\", function () {",
                    "    pm.response.to.have.status(400);",
                    "});",
                    "",
                    "pm.test(\"Error message is correct\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.message).to.equal(\"Email không đúng định dạng\");",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"invalidemail\",\n    \"password\": \"123456\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/login",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "login"]
              },
              description: "Verify login fails with an invalid email format."
            },
            response: []
          },
          {
            name: "5. Login: Empty Email",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 400 Bad Request\", function () {",
                    "    pm.response.to.have.status(400);",
                    "});",
                    "",
                    "pm.test(\"Error message is returned\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.message).to.equal(\"Email không được để trống\");",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"\",\n    \"password\": \"123456\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/login",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "login"]
              },
              description: "Verify login fails when email field is empty."
            },
            response: []
          },
          {
            name: "6. Login: Empty Password",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 400 Bad Request\", function () {",
                    "    pm.response.to.have.status(400);",
                    "});",
                    "",
                    "pm.test(\"Error message is returned\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.message).to.equal(\"Mật khẩu không được để trống\");",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"buyer@gmail.com\",\n    \"password\": \"\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/login",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "login"]
              },
              description: "Verify login fails when password field is empty."
            },
            response: []
          }
        ]
      },
      {
        name: "LUỒNG 2: Kiểm thử tài khoản bị đình chỉ (Suspended Account Login)",
        description: "Verify login fails for suspended accounts, and succeeds once admin reactivates the account.",
        item: [
          reqAdminLogin,
          reqGetUsers,
          reqLockBuyer,
          {
            name: "Verify Login Blocked (Buyer should get 403)",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 403 Forbidden\", function () {",
                    "    pm.response.to.have.status(403);",
                    "});",
                    "",
                    "pm.test(\"Error is Forbidden\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.error).to.equal(\"Forbidden\");",
                    "    pm.expect(jsonData.message).to.include(\"đình chỉ hoặc khoá\");",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"buyer@gmail.com\",\n    \"password\": \"123456\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/login",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "login"]
              },
              description: "Verify user login fails when suspended."
            },
            response: []
          },
          reqUnlockBuyer,
          {
            name: "Verify Login Allowed (Buyer should get 200)",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 200 or 201\", function () {",
                    "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                    "});",
                    "",
                    "pm.test(\"Buyer token is returned\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.access_token).to.not.be.undefined;",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"buyer@gmail.com\",\n    \"password\": \"123456\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/login",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "login"]
              },
              description: "Verify user can log in successfully after account is activated."
            },
            response: []
          }
        ]
      },
      {
        name: "LUỒNG 3: Đăng ký & Kích hoạt qua OTP (Registration & Activation Flow)",
        description: "E2E flow testing registration, verification of login block on pending state, retrieving OTP dynamically, verifying OTP, and logging in successfully.",
        item: [
          {
            name: "1. Register New User (Pending Status)",
            event: [
              {
                listen: "prerequest",
                script: {
                  exec: [
                    "var randomNum = Math.floor(Math.random() * 900000) + 100000;",
                    "var newEmail = \"newuser_\" + randomNum + \"@gmail.com\";",
                    "var newPhone = \"090\" + randomNum;",
                    "pm.collectionVariables.set(\"new_user_email\", newEmail);",
                    "pm.collectionVariables.set(\"new_user_phone\", newPhone);",
                    "pm.collectionVariables.set(\"new_user_password\", \"password123\");"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              },
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 200 or 201\", function () {",
                    "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                    "});",
                    "",
                    "pm.test(\"Registered user status is pending\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.status).to.equal(\"pending\");",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"{{new_user_email}}\",\n    \"password\": \"{{new_user_password}}\",\n    \"full_name\": \"E2E Test User\",\n    \"phone\": \"{{new_user_phone}}\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/register",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "register"]
              },
              description: "Register a new user account, which will start with status 'pending' awaiting OTP."
            },
            response: []
          },
          {
            name: "2. Verify Pending User Cannot Login (403)",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 403 Forbidden\", function () {",
                    "    pm.response.to.have.status(403);",
                    "});",
                    "",
                    "pm.test(\"Error message requests OTP verification\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.message).to.include(\"xác thực mã OTP\");",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"{{new_user_email}}\",\n    \"password\": \"{{new_user_password}}\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/login",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "login"]
              },
              description: "Verify that users in pending status cannot login yet."
            },
            response: []
          },
          {
            name: "3. Retrieve Register OTP Code",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 200\", function () {",
                    "    pm.response.to.have.status(200);",
                    "});",
                    "",
                    "pm.test(\"OTP is returned and saved\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.code).to.not.be.undefined;",
                    "    pm.collectionVariables.set(\"new_user_otp\", jsonData.code);",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "GET",
              header: [],
              url: {
                raw: "{{gateway_url}}/api/auth/debug/latest-otp?email={{new_user_email}}",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "debug", "latest-otp"],
                query: [
                  {
                    key: "email",
                    value: "{{new_user_email}}"
                  }
                ]
              },
              description: "Debug endpoint to retrieve the verification OTP for the new user."
            },
            response: []
          },
          {
            name: "4. Verify Register OTP",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 200 or 201\", function () {",
                    "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                    "});",
                    "",
                    "pm.test(\"Verification is successful\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.success).to.be.true;",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"{{new_user_email}}\",\n    \"code\": \"{{new_user_otp}}\",\n    \"purpose\": \"REGISTER\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/verify-otp",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "verify-otp"]
              },
              description: "Verify the registration OTP code to activate the user account."
            },
            response: []
          },
          {
            name: "5. Login: Newly Activated User Account",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 200 or 201\", function () {",
                    "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                    "});",
                    "",
                    "pm.test(\"Access token is returned for new user\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.access_token).to.not.be.undefined;",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"{{new_user_email}}\",\n    \"password\": \"{{new_user_password}}\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/login",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "login"]
              },
              description: "Verify the newly activated user can log in successfully."
            },
            response: []
          }
        ]
      },
      {
        name: "LUỒNG 4: Quên mật khẩu & Đặt lại mật khẩu (Forgot & Reset Password Flow)",
        description: "Self-contained E2E flow testing registration, verification, forgotten password request, OTP retrieval, resetting password, and verifying old password fails while new password succeeds.",
        item: [
          {
            name: "1. Register New User for Reset Test",
            event: [
              {
                listen: "prerequest",
                script: {
                  exec: [
                    "var randomNum = Math.floor(Math.random() * 900000) + 100000;",
                    "var newEmail = \"resetuser_\" + randomNum + \"@gmail.com\";",
                    "var newPhone = \"091\" + randomNum;",
                    "pm.collectionVariables.set(\"reset_user_email\", newEmail);",
                    "pm.collectionVariables.set(\"reset_user_phone\", newPhone);",
                    "pm.collectionVariables.set(\"reset_user_password\", \"password123\");"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              },
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 200 or 201\", function () {",
                    "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"{{reset_user_email}}\",\n    \"password\": \"{{reset_user_password}}\",\n    \"full_name\": \"Reset Test User\",\n    \"phone\": \"{{reset_user_phone}}\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/register",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "register"]
              },
              description: "Register a user for testing password reset."
            },
            response: []
          },
          {
            name: "2. Retrieve Register OTP Code",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 200\", function () {",
                    "    pm.response.to.have.status(200);",
                    "});",
                    "",
                    "pm.test(\"OTP is returned and saved\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.code).to.not.be.undefined;",
                    "    pm.collectionVariables.set(\"reset_user_otp\", jsonData.code);",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "GET",
              header: [],
              url: {
                raw: "{{gateway_url}}/api/auth/debug/latest-otp?email={{reset_user_email}}",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "debug", "latest-otp"],
                query: [
                  {
                    key: "email",
                    value: "{{reset_user_email}}"
                  }
                ]
              },
              description: "Retrieve registration OTP for the reset test user."
            },
            response: []
          },
          {
            name: "3. Verify Register OTP",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 200 or 201\", function () {",
                    "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"{{reset_user_email}}\",\n    \"code\": \"{{reset_user_otp}}\",\n    \"purpose\": \"REGISTER\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/verify-otp",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "verify-otp"]
              },
              description: "Verify the registration OTP code to activate the user account."
            },
            response: []
          },
          {
            name: "4. Request Forgot Password",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 200 or 201\", function () {",
                    "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                    "});",
                    "",
                    "pm.test(\"OTP request message returned\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.message).to.include(\"OTP sent\");",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"{{reset_user_email}}\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/forgot-password",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "forgot-password"]
              },
              description: "Request password reset OTP for the reset test account."
            },
            response: []
          },
          {
            name: "5. Retrieve Reset Password OTP Code",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 200\", function () {",
                    "    pm.response.to.have.status(200);",
                    "});",
                    "",
                    "pm.test(\"OTP is returned and saved\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.code).to.not.be.undefined;",
                    "    pm.collectionVariables.set(\"reset_user_reset_otp\", jsonData.code);",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "GET",
              header: [],
              url: {
                raw: "{{gateway_url}}/api/auth/debug/latest-otp?email={{reset_user_email}}",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "debug", "latest-otp"],
                query: [
                  {
                    key: "email",
                    value: "{{reset_user_email}}"
                  }
                ]
              },
              description: "Debug endpoint to retrieve the password reset OTP for the user."
            },
            response: []
          },
          {
            name: "6. Reset Password with OTP",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 200 or 201\", function () {",
                    "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                    "});",
                    "",
                    "pm.test(\"Password reset is successful\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.message).to.equal(\"Password reset successfully\");",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"{{reset_user_email}}\",\n    \"code\": \"{{reset_user_reset_otp}}\",\n    \"newPassword\": \"newpassword456\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/reset-password",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "reset-password"]
              },
              description: "Reset user password using the retrieved OTP code."
            },
            response: []
          },
          {
            name: "7. Verify Login with Old Password Fails",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 401 Unauthorized\", function () {",
                    "    pm.response.to.have.status(401);",
                    "});",
                    "",
                    "pm.test(\"Old password login fails\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.message).to.equal(\"Thông tin đăng nhập không hợp lệ\");",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"{{reset_user_email}}\",\n    \"password\": \"{{reset_user_password}}\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/login",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "login"]
              },
              description: "Verify that the old password can no longer be used to log in."
            },
            response: []
          },
          {
            name: "8. Verify Login with New Password Succeeds",
            event: [
              {
                listen: "test",
                script: {
                  exec: [
                    "pm.test(\"Status code is 200 or 201\", function () {",
                    "    pm.expect(pm.response.code).to.be.oneOf([200, 201]);",
                    "});",
                    "",
                    "pm.test(\"Login succeeds and new token returned\", function () {",
                    "    var jsonData = pm.response.json();",
                    "    pm.expect(jsonData.access_token).to.not.be.undefined;",
                    "});"
                  ],
                  type: "text/javascript",
                  packages: {}
                }
              }
            ],
            request: {
              auth: { type: "noauth" },
              method: "POST",
              header: [],
              body: {
                mode: "raw",
                raw: "{\n    \"email\": \"{{reset_user_email}}\",\n    \"password\": \"newpassword456\"\n}",
                options: { raw: { language: "json" } }
              },
              url: {
                raw: "{{gateway_url}}/api/auth/login",
                host: ["{{gateway_url}}"],
                path: ["api", "auth", "login"]
              },
              description: "Verify that login succeeds using the new password."
            },
            response: []
          }
        ]
      }
    ],
    auth: template.auth,
    event: template.event,
    variable: [
      {
        key: "gateway_url",
        value: "http://localhost:3000",
        type: "string"
      },
      {
        key: "admin_token",
        value: ""
      },
      {
        key: "buyer_id",
        value: ""
      },
      {
        key: "new_user_email",
        value: ""
      },
      {
        key: "new_user_phone",
        value: ""
      },
      {
        key: "new_user_password",
        value: ""
      },
      {
        key: "new_user_otp",
        value: ""
      },
      {
        key: "reset_user_email",
        value: ""
      },
      {
        key: "reset_user_phone",
        value: ""
      },
      {
        key: "reset_user_password",
        value: ""
      },
      {
        key: "reset_user_otp",
        value: ""
      },
      {
        key: "reset_user_reset_otp",
        value: ""
      }
    ]
  };

  fs.writeFileSync(outputPath, JSON.stringify(newCollection, null, 2), 'utf8');
  fs.writeFileSync(accountOutputPath, JSON.stringify(newCollection, null, 2), 'utf8');
  console.log('Collections successfully generated from template!');
}

buildCollection();
