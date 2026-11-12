# DESIGN.md: Galmee Coffee

Change this file first, then the code.

> Coffee uses the **Galmee design system**. Tokens live in `src/app/globals.css`
> (only `--trade` and the scale-readout tokens are coffee-specific), shared
> components in `src/components/galmee/`. The colour and type tables below are
> superseded by the system; the brief, the scale readout and the wireframes stay.

## Brief

- **Subject:** a coffee collection point in the Sidama and Guji highlands during harvest. Shade trees over the drying beds, jute sacks stencilled with a grade, a platform scale, a clerk with a buying book and a queue of farmers with their cherries.
- **Audience:** the buying clerk at the scale (one thumb, a queue in front of them) and the owner (who wants every kilo, every birr and every advance per farmer, so there are no arguments at the end of the harvest).
- **Primary job:** record a weighing in a few taps, and always be able to show a farmer exactly what is due.

## Colour

| Token | Hex | Role |
| --- | --- | --- |
| `--shade` | `#1F4D3A` | Dominant. Shade trees: header, primary action. White on it is 9.6:1. |
| `--bean` | `#EEF1E7` | Page background, the grey-green of washed beans. |
| `--ink` | `#18201B` | Text. |
| `--rule` | `#CDD3C4` | Borders and hairlines. |
| `--scale` on `--scale-ground` | `#D8F2A2` on `#11201A` | The scale readout. Used only for the one figure that matters on a screen. |
| `--cherry` | `#A8201A` | Ripe cherry: a farmer who still owes an advance, errors. |

Status is never colour alone: "Owes you" and "Due" are written beside the figure.

## Type

- **Bitter** (English and Afaan Oromo): a sturdy slab, like the stencil on a jute sack and the figures in a buying book. Figures use tabular numerals (`.num`).
- **Noto Sans Ethiopic** for Amharic, 400/600.
- Self-hosted with `next/font/local`.
- Scale: 14 / 16 / 20 / 24; the scale readout is 36 bold.

## Layout (360 px first)

```
+----------------------------+
| Business name    [lang][x] |  shade header
+----------------------------+
| COFFEE BOUGHT              |
| 1,250.5 kg                 |  scale readout, the one bold thing
| 150,060 ETB · 12 farmers   |
+----------------------------+
| By grade                   |
| Washed A          820 kg   |
| Natural           430 kg   |
+----------------------------+
| Today  Buy  Farmers  Stock |
+----------------------------+
```

Buying form: farmer search, grade tiles, kilos and price, a live amount in the readout, one button. Desktop: sidebar left, form in two columns, max 64 rem wide.

## Rules

- One readout per screen.
- Corrections are never edits: a voided line stays on the statement, struck through, with its reason.
- Spend boldness on the readout; everything else stays flat with hairlines.
