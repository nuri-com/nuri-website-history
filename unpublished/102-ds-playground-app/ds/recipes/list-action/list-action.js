/* ──────────────────────────────────────────────────────────────
 * NURI · COMPONENT · LIST-ACTION · CUSTOM ELEMENT
 *
 * <nuri-list-action> is the list family's pressable row: a pressable root with
 * generated composition slots for a leading glyph avatar, content text, optional
 * trailing value stack, and a trailing icon. Separators and grouping are sibling
 * composition, not row anatomy.
 * ────────────────────────────────────────────────────────────── */

import { defineNuriComponent, nuriNames } from '../../factory/factory.js';
import { listActionDescriptor } from '../../generated/descriptors/list-action.js';
import '../icon-avatar/icon-avatar.js';
import '../../primitives/pressable/pressable.js';
import '../../primitives/view/view.js';
import '../../primitives/typography/typography.js';
import '../../primitives/icon/icon.js';

defineNuriComponent(listActionDescriptor, nuriNames('list-action').web);
