const paths = {
  book: "M4 4h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v15h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4z M12 5v15",
  search: "m21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  plus: "M12 5v14 M5 12h14",
  filter: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  arrow: "M5 12h14 m-5-5 5 5-5 5",
  back: "m14 6-6 6 6 6",
  close: "m6 6 12 12 M6 18 18 6",
  check: "m5 12 4 4L19 6",
  more: "M5 12h.01 M12 12h.01 M19 12h.01",
  chart: "M4 4v16h16 M8 15v-4 M13 15V7 M18 15v-7",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  edit: "m15 4 5 5-11 11H4v-5z M13 6l5 5",
  pin: "m9 3 6 0-1 6 4 4H6l4-4z M12 13v8",
  copy: "M8 8h12v12H8z M16 8V4H4v12h4",
  trash: "M4 6h16 M9 6V3h6v3 M6 6l1 14h10l1-14 M10 10v6 M14 10v6",
  link: "M14 4h6v6 M20 4 10 14 M10 4H4v16h16v-6",
  like: "M7 10v11H3V10h4z M7 19h10.3a2 2 0 0 0 2-1.6l1.4-6A2 2 0 0 0 18.7 9H14l.7-3.2A2.3 2.3 0 0 0 12.5 3L7 10z",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z",
};
export const ico = (n) =>
  `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${paths[n] || paths.book}"/></svg>`;
export const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
