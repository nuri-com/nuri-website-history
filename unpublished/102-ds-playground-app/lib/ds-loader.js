// DS-Loader — eine Datei, eine Verantwortlichkeit.
// Lädt alle DS-JS-Module in der richtigen Reihenfolge.
// CSS geht via <link> in index.html.

// Factory first
import '../ds/factory/factory.js';

// Generated
import '../ds/generated/icons.js';
import '../ds/generated/accents.js';
import '../ds/generated/bottom-sheet-chrome.js';

// Primitives
import '../ds/primitives/scope/scope.js';
import '../ds/primitives/icon/icon.js';
import '../ds/primitives/input/input.js';
import '../ds/primitives/pressable/pressable.js';
import '../ds/primitives/view/view.js';
import '../ds/primitives/typography/typography.js';
import '../ds/primitives/stack/stack.js';
import '../ds/primitives/screen/screen.js';
import '../ds/primitives/scroll/scroll.js';
import '../ds/primitives/dock/dock.js';
import '../ds/primitives/separator/separator.js';
import '../ds/primitives/list-separator/list-separator.js';
import '../ds/primitives/spacer/spacer.js';

// Recipes
import '../ds/recipes/alert/alert.js';
import '../ds/recipes/button/button.js';
import '../ds/recipes/icon-button/icon-button.js';
import '../ds/recipes/icon-avatar/icon-avatar.js';
import '../ds/recipes/topbar/topbar.js';
import '../ds/recipes/list/list.js';
import '../ds/recipes/list-action/list-action.js';
import '../ds/recipes/text-field/text-field.js';
import '../ds/recipes/tab-bar/tab-bar.js';
import '../ds/recipes/tab-bar-item/tab-bar-item.js';
import '../ds/recipes/bottom-sheet/bottom-sheet.js';
import '../ds/recipes/bottom-sheet-panel/bottom-sheet-panel.js';