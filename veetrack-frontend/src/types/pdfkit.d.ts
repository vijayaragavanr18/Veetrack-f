declare module "pdfkit" {
  // PDFKit doesn't ship types. We declare it as a class with `any` methods
  // so strict mode doesn't choke, while still allowing all method chaining.
  const PDFDocument: any;
  export default PDFDocument;
}
