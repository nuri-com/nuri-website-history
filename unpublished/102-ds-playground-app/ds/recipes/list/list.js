/* ──────────────────────────────────────────────────────────────
 * NURI · COMPONENT · LIST · CUSTOM ELEMENT
 *
 * <nuri-list> is the list family's open host. It renders positional children
 * directly, so list-action rows and list-separator dividers stay siblings.
 * ────────────────────────────────────────────────────────────── */

import { defineNuriComponent, nuriNames } from '../../factory/factory.js';
import { listDescriptor } from '../../generated/descriptors/list.js';
import '../../primitives/view/view.js';
import '../list-action/list-action.js';
import '../../primitives/list-separator/list-separator.js';

defineNuriComponent(listDescriptor, nuriNames('list').web);
