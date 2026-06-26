"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateCounts = aggregateCounts;
exports.buildNotification = buildNotification;
exports.normalizeLocale = normalizeLocale;
function aggregateCounts(events) {
    const c = {
        itemsAdded: 0,
        itemsChecked: 0,
        itemsUnchecked: 0,
        itemsDeleted: 0,
        itemsCleared: 0,
        listsCreated: 0,
        listsRenamed: 0,
        listsArchived: 0,
        listsDeleted: 0,
    };
    for (const e of events) {
        switch (e.type) {
            case "item_added":
                c.itemsAdded += 1;
                break;
            case "items_added":
                c.itemsAdded += e.count ?? 1;
                break;
            case "item_checked":
                c.itemsChecked += 1;
                break;
            case "item_unchecked":
                c.itemsUnchecked += 1;
                break;
            case "item_deleted":
                c.itemsDeleted += 1;
                break;
            case "items_cleared":
                c.itemsCleared += e.count ?? 1;
                break;
            case "list_created":
                c.listsCreated += 1;
                break;
            case "list_renamed":
                c.listsRenamed += 1;
                break;
            case "list_archived":
                c.listsArchived += 1;
                break;
            case "list_deleted":
                c.listsDeleted += 1;
                break;
        }
    }
    return c;
}
function part(locale, key, n) {
    if (n <= 0)
        return null;
    const dict = {
        hu: {
            itemsAdded: (x) => `${x} új tétel`,
            itemsChecked: (x) => `${x} megvásárolva`,
            itemsUnchecked: (x) => `${x} visszavonva`,
            itemsDeleted: (x) => `${x} törölve`,
            itemsCleared: (x) => `${x} megvásárolt törölve`,
            listsCreated: (x) => `${x} új lista`,
            listsRenamed: (x) => `${x} lista átnevezve`,
            listsArchived: (x) => `${x} lista archiválva`,
            listsDeleted: (x) => `${x} lista törölve`,
        },
        en: {
            itemsAdded: (x) => `${x} item${x === 1 ? "" : "s"} added`,
            itemsChecked: (x) => `${x} bought`,
            itemsUnchecked: (x) => `${x} unchecked`,
            itemsDeleted: (x) => `${x} deleted`,
            itemsCleared: (x) => `${x} bought item${x === 1 ? "" : "s"} cleared`,
            listsCreated: (x) => `${x} list${x === 1 ? "" : "s"} created`,
            listsRenamed: (x) => `${x} list${x === 1 ? "" : "s"} renamed`,
            listsArchived: (x) => `${x} list${x === 1 ? "" : "s"} archived`,
            listsDeleted: (x) => `${x} list${x === 1 ? "" : "s"} deleted`,
        },
        de: {
            itemsAdded: (x) => `${x} Artikel hinzugefügt`,
            itemsChecked: (x) => `${x} gekauft`,
            itemsUnchecked: (x) => `${x} zurückgenommen`,
            itemsDeleted: (x) => `${x} gelöscht`,
            itemsCleared: (x) => `${x} gekaufte Artikel entfernt`,
            listsCreated: (x) => `${x} Liste${x === 1 ? "" : "n"} erstellt`,
            listsRenamed: (x) => `${x} Liste${x === 1 ? "" : "n"} umbenannt`,
            listsArchived: (x) => `${x} Liste${x === 1 ? "" : "n"} archiviert`,
            listsDeleted: (x) => `${x} Liste${x === 1 ? "" : "n"} gelöscht`,
        },
    };
    return dict[locale][key](n);
}
function buildNotification(locale, events) {
    const counts = aggregateCounts(events);
    const parts = Object.keys(counts)
        .map((k) => part(locale, k, counts[k]))
        .filter(Boolean);
    const listNames = [...new Set(events.map((e) => e.listName).filter(Boolean))].slice(0, 2);
    const listsSuffix = listNames.length > 0
        ? ` · ${listNames.join(locale === "hu" ? ", " : ", ")}`
        : "";
    const actorUids = new Set(events.map((e) => e.actorUid));
    const actorNames = [...new Set(events.map((e) => e.actorName))];
    const actorLabel = actorUids.size === 1 && actorNames[0]
        ? actorNames[0]
        : locale === "hu"
            ? "A család"
            : locale === "de"
                ? "Die Familie"
                : "Your household";
    const summary = parts.length > 0 ? parts.join(", ") : locale === "hu" ? "Frissítések" : locale === "de" ? "Aktualisierungen" : "Updates";
    return {
        title: "PickIt",
        body: `${actorLabel}: ${summary}${listsSuffix}`,
    };
}
function normalizeLocale(raw) {
    if (raw === "en" || raw === "de" || raw === "hu")
        return raw;
    return "hu";
}
//# sourceMappingURL=summary.js.map