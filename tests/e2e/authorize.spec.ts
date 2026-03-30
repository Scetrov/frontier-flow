import { expect, test } from "@playwright/test";

import { SEEN_TUTORIAL_STORAGE_STATE, TUTORIAL_STORAGE_KEY } from "./fixtures/storage";
import { getCompilationStatusButton, selectDeploymentTarget } from "./fixtures/workflow";
import { createDevInspectSuccessResponse } from "../../src/test/turretSimulationMocks";
import { encodeSimulationPriorityEntries } from "../../src/utils/turretSimulationCodec";

const CONNECTED_ADDRESS = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const CHARACTER_ID = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OWNER_CAP_ID = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const TURRET_ID = "0x2222222222222222222222222222222222222222222222222222222222222222";
const LEGACY_PACKAGE_ID = "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";
const LEGACY_MODULE_NAME = "legacy_extension";
const WALLET_NAME = "Mock Sui Wallet";
const WALLET_STORAGE_KEY = "frontier-flow:sui-wallet";
const SIMULATED_TARGET_ITEM_ID = "900001";
const SIMULATED_PRIORITY_WEIGHT = "120";
const SIMULATED_TYPE_ID = "900002";
const SIMULATED_GROUP_ID = "25";
const SIMULATED_CHARACTER_ID = "42";
const SIMULATED_CHARACTER_TRIBE = "7";

function createGraphQlResponse() {
  return {
    data: {
      address: {
        objects: {
          nodes: [
            {
              address: OWNER_CAP_ID,
              contents: {
                json: {
                  fields: {
                    turret_id: TURRET_ID,
                  },
                },
              },
            },
          ],
        },
      },
    },
  };
}

test("runs the full turret authorization workflow and refreshes the list after completion", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop authorization workflow coverage only.");

  await page.addInitScript(
    ({ address, storageKey, tutorialState, tutorialStorageKey, walletName }) => {
      window.localStorage.clear();
      window.localStorage.setItem(tutorialStorageKey, JSON.stringify(tutorialState));

      const account = {
        address,
        publicKey: new Uint8Array(32),
        chains: ["sui:testnet"],
        features: ["sui:signTransaction"],
        label: "Mock Capsuleer",
        icon: "data:image/svg+xml;base64,PHN2Zy8+",
      };

      const wallet = {
        version: "1.0.0",
        name: walletName,
        icon: "data:image/svg+xml;base64,PHN2Zy8+",
        chains: ["sui:testnet"],
        accounts: [account],
        features: {
          "standard:connect": {
            version: "1.0.0",
            connect: () => Promise.resolve({ accounts: [account] }),
          },
          "standard:events": {
            version: "1.0.0",
            on: () => () => undefined,
          },
          "sui:signTransaction": {
            version: "2.0.0",
            signTransaction: () => Promise.resolve({
              bytes: "dGVzdA==",
              signature: "QUFBQQ==",
            }),
          },
        },
      };

      window.addEventListener("wallet-standard:app-ready", (event) => {
        const registrationEvent = event as CustomEvent<{ register: (nextWallet: unknown) => void }>;
        registrationEvent.detail.register(wallet);
      });

      window.localStorage.setItem(storageKey, JSON.stringify({
        state: {
          lastConnectedWalletName: walletName,
          lastConnectedAccountAddress: address,
        },
        version: 0,
      }));
    },
    {
      address: CONNECTED_ADDRESS,
      storageKey: WALLET_STORAGE_KEY,
      tutorialState: SEEN_TUTORIAL_STORAGE_STATE,
      tutorialStorageKey: TUTORIAL_STORAGE_KEY,
      walletName: WALLET_NAME,
    },
  );

  await page.route("https://graphql.testnet.sui.io/graphql", async (route) => {
    const body = route.request().postDataJSON() as { query?: string };
    const query = body.query ?? "";

    if (query.includes("query Turrets")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(createGraphQlResponse()),
      });
      return;
    }

    if (query.includes("query TurretObject")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            object: {
              asMoveObject: {
                contents: {
                  json: {
                    fields: {
                      name: "Shield Bastion",
                      authorized_extension: {
                        packageId: LEGACY_PACKAGE_ID,
                        moduleName: LEGACY_MODULE_NAME,
                        typeName: `${LEGACY_PACKAGE_ID}::${LEGACY_MODULE_NAME}::TurretAuth`,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      });
      return;
    }

    if (query.includes("query OwnerCaps")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            address: {
              objects: {
                nodes: [{
                  address: OWNER_CAP_ID,
                  contents: {
                    json: {
                      fields: {
                        turret_id: TURRET_ID,
                      },
                    },
                  },
                }],
              },
            },
          },
        }),
      });
      return;
    }

    if (query.includes("query PlayerProfiles")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            address: {
              objects: {
                nodes: [{
                  contents: {
                    json: {
                      character_id: CHARACTER_ID,
                    },
                  },
                }],
              },
            },
          },
        }),
      });
      return;
    }

    if (query.includes("query Character")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            object: {
              asMoveObject: {
                contents: {
                  json: {
                    key: {
                      item_id: Number(SIMULATED_CHARACTER_ID),
                      tenant: "utopia",
                    },
                    tribe_id: Number(SIMULATED_CHARACTER_TRIBE),
                    metadata: {
                      name: "Mock Capsuleer",
                    },
                  },
                },
              },
            },
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { address: { objects: { nodes: [] } } } }),
    });
  });

  await page.route("https://world-api-stillness.live.tech.evefrontier.com/v2/ships", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [{
          id: Number(SIMULATED_TYPE_ID),
          name: "Mock Frigate",
          classId: Number(SIMULATED_GROUP_ID),
          className: "Frigate",
        }],
      }),
    });
  });

  await page.route("https://world-api-stillness.live.tech.evefrontier.com/v2/tribes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [{
          id: Number(SIMULATED_CHARACTER_TRIBE),
          name: "Sepharim",
          nameShort: "SEP",
        }],
      }),
    });
  });

  await page.route(/https:\/\/fullnode\.testnet\.sui\.io.*/, async (route) => {
    const body = route.request().postDataJSON() as { id: number | string; method?: string; params?: unknown[] };
    const response = { jsonrpc: "2.0", id: body.id };

    switch (body.method) {
      case "suix_getBalance":
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...response,
            result: {
              coinType: "0x2::sui::SUI",
              coinObjectCount: 1,
              totalBalance: "1000000000",
              lockedBalance: {},
            },
          }),
        });
        return;
      case "sui_multiGetObjects":
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...response,
            result: [TURRET_ID, CHARACTER_ID].map((objectId) => ({
              data: {
                digest: "11111111111111111111111111111111",
                objectId,
                owner: { AddressOwner: CONNECTED_ADDRESS },
                type: "0x2::object::Object",
                version: "1",
              },
            })),
          }),
        });
        return;
      case "sui_getNormalizedMoveFunction": {
        const params = Array.isArray(body.params) ? body.params : [];
        const moduleName = typeof params[1] === "string" ? params[1] : "";
        const functionName = typeof params[2] === "string" ? params[2] : "";
        const turretType = {
          Struct: {
            address: "0x2",
            module: "turret",
            name: "Turret",
            typeArguments: [],
          },
        };
        const characterType = {
          Struct: {
            address: "0x2",
            module: "character",
            name: "Character",
            typeArguments: [],
          },
        };
        const onlineReceiptType = {
          Struct: {
            address: "0x2",
            module: "turret",
            name: "OnlineReceipt",
            typeArguments: [],
          },
        };

        const result = moduleName === "turret" && functionName === "verify_online"
          ? {
              isEntry: false,
              parameters: [{ Reference: turretType }],
              return: [onlineReceiptType],
              typeParameters: [],
              visibility: "Public",
            }
          : {
              isEntry: false,
              parameters: [{ Reference: turretType }, { Reference: characterType }, { Vector: "U8" }, onlineReceiptType],
              return: [{ Vector: "U8" }],
              typeParameters: [],
              visibility: "Public",
            };

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...response,
            result,
          }),
        });
        return;
      }
      case "sui_devInspectTransactionBlock": {
        const returnedBytes = encodeSimulationPriorityEntries([{
          targetItemId: SIMULATED_TARGET_ITEM_ID,
          priorityWeight: SIMULATED_PRIORITY_WEIGHT,
        }]);

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...response,
            result: createDevInspectSuccessResponse(Array.from(returnedBytes)),
          }),
        });
        return;
      }
      default:
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...response,
            result: {},
          }),
        });
    }
  });

  await page.goto("/?ff_mock_compiler=1&ff_mock_compile_delay_ms=0&ff_idle_ms=120&ff_mock_wallet=connected&ff_mock_deploy_stage_delay_ms=0&ff_mock_authorize_delay_ms=10");

  await expect(getCompilationStatusButton(page)).toContainText("Compiled");

  await selectDeploymentTarget(page, "testnet:stillness");
  await page.getByRole("button", { name: "Deploy testnet:stillness" }).click();

  const deploymentModal = page.getByRole("dialog", { name: "Deployed" });
  await expect(deploymentModal).toBeVisible();
  await deploymentModal.getByRole("button", { name: "Dismiss" }).click({ force: true });

  const deploymentStatus = page.locator('.ff-compilation-status__button[aria-controls="deployment-status-details"]');
  await expect(deploymentStatus).toContainText("Deployed");

  await page.getByRole("button", { name: "Authorize" }).click();
  await expect(page.getByRole("heading", { name: "Authorize Turrets" })).toBeVisible();

  await expect(page.getByText("Shield Bastion")).toBeVisible();
  await page.getByRole("button", { name: "Simulate turret Shield Bastion" }).click();
  await expect(page.getByRole("button", { name: "Simulate", exact: true })).toHaveAttribute("aria-current", "page");

  await expect(page.getByRole("heading", { name: "Shield Bastion" })).toBeVisible();
  await expect(page.getByText(CHARACTER_ID)).toBeVisible();
  await expect(page.getByLabel("Type Id")).toHaveValue(SIMULATED_TYPE_ID);
  await expect(page.getByLabel("Group Id")).toHaveValue(SIMULATED_GROUP_ID);
  await expect(page.getByLabel("Character Id")).toHaveValue(SIMULATED_CHARACTER_ID);
  await expect(page.getByLabel("Character Tribe")).toHaveValue(SIMULATED_CHARACTER_TRIBE);
  await page.getByLabel("Item Id").fill("900001");
  await page.getByRole("button", { name: "Run Simulation" }).click();

  await expect(page.getByText("Simulation Results")).toBeVisible();
  await expect(page.getByRole("cell", { name: SIMULATED_PRIORITY_WEIGHT })).toBeVisible();

  await page.getByRole("button", { name: "Authorize", exact: true }).click();
  await expect(page.getByRole("button", { name: "Authorize", exact: true })).toHaveAttribute("aria-current", "page");

  await page.getByRole("checkbox", { name: "Shield Bastion" }).check({ force: true });
  await expect(page.getByText("This will replace the current extension")).toBeVisible();
  await page.getByRole("button", { name: "Authorize Selected" }).click();

  const authorizationModal = page.getByRole("dialog", { name: "Authorization complete" });
  await expect(authorizationModal).toBeVisible();
  await expect(authorizationModal.locator(".ff-authorization-modal__row-status", { hasText: "Confirmed" })).toBeVisible();
  await authorizationModal.getByRole("button", { name: "Close" }).click();

  await expect(page.locator(".ff-authorize-turret-item__badge", { hasText: "Current extension" })).toBeVisible();
  await expect(page.getByText(LEGACY_MODULE_NAME)).toHaveCount(0);
});
