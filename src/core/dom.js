export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const stage = $('#stage'),
  layer = $('#layer'),
  setup = $('#setup'),
  form = $('#form');
