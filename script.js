// ---- Settings you might want to change ----

// How many upcoming meetings to list.
var HOW_MANY = 6;

// Dates that are cancelled, as "YYYY-MM-DD". They stay in the list, crossed out.
var CANCELLED = [
  // "2026-11-18",
];

// ------------------------------------------


function thirdWednesday(year, month) {
  var first = new Date(year, month, 1);
  var offset = (3 - first.getDay() + 7) % 7; // 3 = Wednesday
  return new Date(year, month, 1 + offset + 14);
}

function isoDate(d) {
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

function upcomingMeetings(count) {
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var list = [];
  var y = today.getFullYear();
  var m = today.getMonth();
  while (list.length < count) {
    var d = thirdWednesday(y, m);
    if (d >= today) list.push(d);
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return list;
}

function el(tag, className, lang, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (lang) node.lang = lang;
  if (text) node.textContent = text;
  return node;
}

function renderDates() {
  var list = document.getElementById("dates");
  if (!list) return;

  var enMonth = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
  var jaMonth = new Intl.DateTimeFormat("ja-JP", { month: "long", year: "numeric" });

  var markedNext = false;

  upcomingMeetings(HOW_MANY).forEach(function (d) {
    var cancelled = CANCELLED.indexOf(isoDate(d)) !== -1;
    var li = el("li", "date");

    var day = el("div", "date-day", null, String(d.getDate()));
    day.appendChild(el("span", "date-unit", "ja", "日"));
    var meta = el("div", "date-meta");

    var month = el("div", "date-month");
    month.appendChild(el("span", null, "en", enMonth.format(d)));
    month.appendChild(el("span", null, "ja", jaMonth.format(d)));

    var time = el("div", "date-time");
    if (cancelled) {
      li.classList.add("is-cancelled");
      time.appendChild(el("span", null, "en", "Cancelled"));
      time.appendChild(el("span", null, "ja", "お休み"));
    } else {
      time.appendChild(el("span", null, "en", "Wednesday · 6–7pm"));
      time.appendChild(el("span", null, "ja", "水曜日・午後6時〜7時"));
    }

    if (!cancelled && !markedNext) {
      markedNext = true;
      li.classList.add("is-next");
      month.appendChild(el("span", "next-tag", "en", "NEXT"));
      month.appendChild(el("span", "next-tag", "ja", "次回"));
    }

    meta.appendChild(month);
    meta.appendChild(time);
    li.appendChild(day);
    li.appendChild(meta);
    list.appendChild(li);
  });
}

function setupLangToggle() {
  var buttons = document.querySelectorAll("[data-set-lang]");

  function apply(lang, save) {
    document.documentElement.setAttribute("data-lang", lang);
    document.documentElement.lang = lang;
    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === lang));
    });
    if (save) {
      try { localStorage.setItem("lang", lang); } catch (e) {}
    }
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", function () { apply(b.getAttribute("data-set-lang"), true); });
  });

  apply(document.documentElement.getAttribute("data-lang") || "en");
}

renderDates();
setupLangToggle();
