/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type { CatalogState, Category, Product } from './types/catalog.ts';
export { defaultCatalogState } from './catalogDefaults.ts';

import { defaultCatalogState } from './catalogDefaults.ts';

/** Static fallbacks until catalog loads from API — prefer useCatalog() in components. */
export const PRODUCTS = defaultCatalogState.products;
export const CATEGORIES = defaultCatalogState.categories;
export const BUSINESS_HOURS = defaultCatalogState.businessHours;
export const WHATSAPP_NUMBER = defaultCatalogState.whatsapp;
