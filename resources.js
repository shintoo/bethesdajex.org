// Builds the resources page from resources.json.
// To update it, see "Updating the resources page" in README.md.

var DATA_FILE = "resources.json";

// Section headings, by number of ⭐ in the "Essential" column.
var GROUPS = [
  { stars: 3, en: "Top picks",          ja: "イチオシ" },
  { stars: 2, en: "Highly recommended", ja: "おすすめ" },
  { stars: 1, en: "Worth checking out", ja: "要チェック" },
  { stars: 0, en: "More resources",     ja: "その他" },
];

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function bilingual(tag, className, en, ja) {
  var node = el(tag, className);
  var a = el("span", null, en); a.lang = "en";
  var b = el("span", null, ja); b.lang = "ja";
  node.appendChild(a);
  node.appendChild(b);
  return node;
}

function externalLink(text, href) {
  var a = el("a", null, text);
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}

// Appends a cell's segments ({text} or {text, href}) to `parent`.
function appendSegments(parent, segments) {
  segments.forEach(function (seg) {
    parent.appendChild(seg.href ? externalLink(seg.text, seg.href) : document.createTextNode(seg.text));
  });
}

// Splits a cell's segments into lines, for cells with line breaks.
function splitLines(segments) {
  var lines = [[]];
  segments.forEach(function (seg) {
    if (seg.href) { lines[lines.length - 1].push(seg); return; }
    seg.text.split("\n").forEach(function (part, i) {
      if (i > 0) lines.push([]);
      if (part) lines[lines.length - 1].push({ text: part });
    });
  });
  return lines.filter(function (line) {
    return line.some(function (seg) { return seg.href || seg.text.trim(); });
  });
}

function segmentsText(segments) {
  return segments.map(function (seg) { return seg.text; }).join("");
}

function renderResource(res) {
  var item = el("article", "res");

  var title = el("h3", "res-name");
  if (res.href) {
    title.appendChild(externalLink(res.name, res.href));
  } else {
    title.appendChild(document.createTextNode(res.name));
  }
  if (res.beginner) {
    title.appendChild(bilingual("span", "res-tag", "Beginner", "初心者向け"));
  }
  item.appendChild(title);

  if (res.description) item.appendChild(el("p", "res-desc", res.description));

  var meta = [res.price, res.tech, res.kind].filter(Boolean).join(" · ");
  if (meta) item.appendChild(el("p", "res-meta", meta));

  var facts = el("p", "res-meta");
  if (res.language) {
    facts.appendChild(bilingual("span", null, "Language: ", "言語: "));
    facts.appendChild(document.createTextNode(res.language));
  }
  if (res.updated) {
    if (res.language) facts.appendChild(document.createTextNode(" · "));
    facts.appendChild(bilingual("span", null, "Updated regularly: ", "定期更新: "));
    facts.appendChild(document.createTextNode(res.updated));
  }
  if (facts.childNodes.length) item.appendChild(facts);

  if (res.link_extra.length) {
    var where = el("p", "res-where");
    appendSegments(where, res.link_extra);
    item.appendChild(where);
  }

  if (res.notes.length) {
    var details = el("details", "res-notes");
    details.appendChild(bilingual("summary", null, "Notes", "メモ"));
    res.notes.forEach(function (note) {
      splitLines(note).forEach(function (line) {
        var p = el("p");
        appendSegments(p, line);
        details.appendChild(p);
      });
    });
    item.appendChild(details);
  }

  return item;
}

function matches(res, filters) {
  if (filters.beginner && !res.beginner) return false;
  if (filters.free && !/free/i.test(res.price)) return false;
  if (filters.query) {
    var hay = [res.name, res.description, res.tech, res.kind, res.language].concat(res.notes.map(segmentsText)).join(" ").toLowerCase();
    if (hay.indexOf(filters.query) === -1) return false;
  }
  return true;
}

function render(all, filters) {
  var root = document.getElementById("resources");
  root.innerHTML = "";
  var shown = 0;

  GROUPS.forEach(function (group) {
    var items = all.filter(function (res) {
      return Math.min(res.stars, 3) === group.stars && matches(res, filters);
    });
    if (!items.length) return;
    shown += items.length;

    var section = el("section", "res-group");
    section.appendChild(bilingual("h2", "label", group.en, group.ja));
    items.forEach(function (res) { section.appendChild(renderResource(res)); });
    root.appendChild(section);
  });

  if (!shown) {
    root.appendChild(bilingual("p", "res-empty", "Nothing matches.", "該当するものがありません。"));
  }
}

function init() {
  var root = document.getElementById("resources");
  if (!root) return;

  var filters = { beginner: false, free: false, query: "" };
  var all = [];

  document.querySelectorAll("[data-filter]").forEach(function (b) {
    b.addEventListener("click", function () {
      var key = b.getAttribute("data-filter");
      filters[key] = !filters[key];
      b.setAttribute("aria-pressed", String(filters[key]));
      render(all, filters);
    });
  });

  document.getElementById("res-search").addEventListener("input", function (e) {
    filters.query = e.target.value.trim().toLowerCase();
    render(all, filters);
  });

  fetch(DATA_FILE)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      all = data;
      render(all, filters);
    })
    .catch(function () {
      root.appendChild(el("p", "res-empty", "Couldn't load the list."));
    });
}

init();
