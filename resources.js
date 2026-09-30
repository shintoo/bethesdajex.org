// Builds the resources page from learning_resources.csv.
// To update: re-download the spreadsheet as CSV and replace that file.

var CSV_FILE = "learning_resources.csv";

// Section headings, by number of ⭐ in the "Essential" column.
var GROUPS = [
  { stars: 3, en: "Top picks",          ja: "イチオシ" },
  { stars: 2, en: "Highly recommended", ja: "おすすめ" },
  { stars: 1, en: "Worth checking out", ja: "要チェック" },
  { stars: 0, en: "More resources",     ja: "その他" },
];


function parseCSV(text) {
  var rows = [], row = [], field = "", inQuotes = false;
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else {
      field += c;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// The sheet has blank rows above the header and a legend below the list,
// so read from the "Name" header row down to the first blank row.
function readResources(rows) {
  var start = rows.findIndex(function (r) { return (r[1] || "").trim() === "Name"; });
  if (start === -1) return [];
  var header = rows[start].map(function (h) { return h.trim(); });
  var col = function (name) { return header.indexOf(name); };

  var out = [];
  for (var i = start + 1; i < rows.length; i++) {
    var r = rows[i];
    var get = function (name) { return ((r[col(name)] || "") + "").trim(); };
    if (!get("Name")) break;

    var rating = r[0] || "";
    out.push({
      name: get("Name"),
      stars: (rating.match(/⭐/g) || []).length,
      beginner: rating.indexOf("🌱") !== -1,
      description: get("Description"),
      price: get("Free?"),
      tech: get("Tech type"),
      kind: get("Resource type"),
      language: get("Resource language"),
      link: get("Link"),
      updated: get("Regularly updated?"),
      notes: [get("Other notes"), get("Even more other notes")].filter(Boolean),
    });
  }
  return out;
}

var URL_RE = /https?:\/\/[^\s;]+/g;

// Returns { href, extra }. `extra` is the link cell's text when it's more than a single URL.
function parseLink(cell) {
  var urls = cell.match(URL_RE) || [];
  if (urls.length) {
    return { href: urls[0], extra: cell === urls[0] ? "" : cell };
  }
  if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(cell)) {
    return { href: "https://" + cell, extra: "" };
  }
  return { href: null, extra: cell };
}

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

// Appends text to `parent`, turning any URLs in it into links.
function appendLinked(parent, text) {
  var last = 0;
  text.replace(URL_RE, function (url, index) {
    parent.appendChild(document.createTextNode(text.slice(last, index)));
    var a = el("a", null, url);
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    parent.appendChild(a);
    last = index + url.length;
  });
  parent.appendChild(document.createTextNode(text.slice(last)));
}

function renderResource(res) {
  var item = el("article", "res");
  var link = parseLink(res.link);

  var title = el("h3", "res-name");
  if (link.href) {
    var a = el("a", null, res.name);
    a.href = link.href;
    a.target = "_blank";
    a.rel = "noopener";
    title.appendChild(a);
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

  if (link.extra) {
    var where = el("p", "res-where");
    appendLinked(where, link.extra);
    item.appendChild(where);
  }

  if (res.notes.length) {
    var details = el("details", "res-notes");
    details.appendChild(bilingual("summary", null, "Notes", "メモ"));
    res.notes.forEach(function (note) {
      note.split(/\n+/).forEach(function (line) {
        if (!line.trim()) return;
        var p = el("p");
        appendLinked(p, line.trim());
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
    var hay = [res.name, res.description, res.tech, res.kind, res.language].concat(res.notes).join(" ").toLowerCase();
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

  fetch(CSV_FILE)
    .then(function (r) { return r.text(); })
    .then(function (text) {
      all = readResources(parseCSV(text));
      render(all, filters);
    })
    .catch(function () {
      root.appendChild(el("p", "res-empty", "Couldn't load the list."));
    });
}

init();
