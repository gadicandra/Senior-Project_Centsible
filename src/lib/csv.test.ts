import { expect, test } from "vitest";
import { csvCell, toCsv } from "./csv";

test("csvCell: kutip, koma, baris baru", () => {
  expect(csvCell("makan")).toBe("makan");
  expect(csvCell("nasi, telur")).toBe('"nasi, telur"');
  expect(csvCell('kata "enak"')).toBe('"kata ""enak"""');
  expect(csvCell("a\nb")).toBe('"a\nb"');
  expect(csvCell(25000)).toBe("25000");
});

test("csvCell: cegah rumus spreadsheet", () => {
  expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
  expect(csvCell("+1")).toBe("'+1");
  expect(csvCell("-5")).toBe("'-5");
  expect(csvCell("@a")).toBe("'@a");
  expect(csvCell("=1,2")).toBe(`"'=1,2"`);
});

test("toCsv: BOM, CRLF, header", () => {
  expect(toCsv(["a", "b"], [["x", 1]])).toBe("\uFEFFa,b\r\nx,1\r\n");
});
