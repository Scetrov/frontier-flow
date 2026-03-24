import type { GeneratedSourceFile } from "./types";

const WORLD_SHIM_SOURCE_DIR = "deps/world/sources";

const WORLD_SHIM_MOVE_TOML = [
  "[package]",
  'name = "world"',
  'edition = "2024.beta"',
    "",
    "[addresses]",
    'world = "0x0"',
  "",
].join("\n");

const IN_GAME_ID_MODULE = `module world::in_game_id;

use std::string::String;

public struct TenantItemId has copy, drop, store {
    item_id: u64,
    tenant: String,
}

public fun item_id(key: &TenantItemId): u64 {
    key.item_id
}
`;

const CHARACTER_MODULE = `module world::character;

use sui::object::UID;
use world::in_game_id::TenantItemId;

public struct Character has key {
    id: UID,
    key: TenantItemId,
    tribe_id: u32,
}

public fun key(character: &Character): TenantItemId {
    character.key
}

public fun tribe(character: &Character): u32 {
    character.tribe_id
}
`;

const TURRET_MODULE = `module world::turret;

use sui::object::{Self, ID, UID};

public struct Turret has key {
    id: UID,
}

public struct ReturnTargetPriorityList has copy, drop, store {
    target_item_id: u64,
    priority_weight: u64,
}

public struct OnlineReceipt {
    turret_id: ID,
}

public fun new_return_target_priority_list(
    target_item_id: u64,
    priority_weight: u64,
): ReturnTargetPriorityList {
    ReturnTargetPriorityList { target_item_id, priority_weight }
}

public fun turret_id(receipt: &OnlineReceipt): ID {
    receipt.turret_id
}

public fun destroy_online_receipt<Auth: drop>(receipt: OnlineReceipt, _: Auth) {
    let OnlineReceipt { turret_id: _ } = receipt;
}
`;

export function createWorldShimSourceFiles(): readonly GeneratedSourceFile[] {
  return [
    { path: "deps/world/Move.toml", content: WORLD_SHIM_MOVE_TOML },
    { path: `${WORLD_SHIM_SOURCE_DIR}/in_game_id.move`, content: IN_GAME_ID_MODULE },
    { path: `${WORLD_SHIM_SOURCE_DIR}/character.move`, content: CHARACTER_MODULE },
    { path: `${WORLD_SHIM_SOURCE_DIR}/turret.move`, content: TURRET_MODULE },
  ];
}

export function createStandaloneWorldShimPackageFiles(): Readonly<Record<string, string>> {
    return {
        "Move.toml": WORLD_SHIM_MOVE_TOML,
        "sources/in_game_id.move": IN_GAME_ID_MODULE,
        "sources/character.move": CHARACTER_MODULE,
        "sources/turret.move": TURRET_MODULE,
    };
}