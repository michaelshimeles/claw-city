/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as admin from "../admin.js";
import type * as agentGuide from "../agentGuide.js";
import type * as agents from "../agents.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as dataPreview from "../dataPreview.js";
import type * as events from "../events.js";
import type * as friendships from "../friendships.js";
import type * as gangs from "../gangs.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as journals from "../journals.js";
import type * as leaderboards from "../leaderboards.js";
import type * as ledger from "../ledger.js";
import type * as lib_agentNames from "../lib/agentNames.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_goals from "../lib/goals.js";
import type * as lib_nicknames from "../lib/nicknames.js";
import type * as lib_rng from "../lib/rng.js";
import type * as lib_takedownThemes from "../lib/takedownThemes.js";
import type * as lib_tax from "../lib/tax.js";
import type * as map from "../map.js";
import type * as messages from "../messages.js";
import type * as seed from "../seed.js";
import type * as skillDocs from "../skillDocs.js";
import type * as social from "../social.js";
import type * as summaries from "../summaries.js";
import type * as tickHelpers from "../tickHelpers.js";
import type * as tickRunner from "../tickRunner.js";
import type * as world from "../world.js";
import type * as zones from "../zones.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  admin: typeof admin;
  agentGuide: typeof agentGuide;
  agents: typeof agents;
  crons: typeof crons;
  dashboard: typeof dashboard;
  dataPreview: typeof dataPreview;
  events: typeof events;
  friendships: typeof friendships;
  gangs: typeof gangs;
  goals: typeof goals;
  http: typeof http;
  journals: typeof journals;
  leaderboards: typeof leaderboards;
  ledger: typeof ledger;
  "lib/agentNames": typeof lib_agentNames;
  "lib/auth": typeof lib_auth;
  "lib/constants": typeof lib_constants;
  "lib/goals": typeof lib_goals;
  "lib/nicknames": typeof lib_nicknames;
  "lib/rng": typeof lib_rng;
  "lib/takedownThemes": typeof lib_takedownThemes;
  "lib/tax": typeof lib_tax;
  map: typeof map;
  messages: typeof messages;
  seed: typeof seed;
  skillDocs: typeof skillDocs;
  social: typeof social;
  summaries: typeof summaries;
  tickHelpers: typeof tickHelpers;
  tickRunner: typeof tickRunner;
  world: typeof world;
  zones: typeof zones;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
