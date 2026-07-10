declare module "html2pdf.js" {
  type Html2PdfOptions = {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: Record<string, unknown>;
    jsPDF?: Record<string, unknown>;
    pagebreak?: Record<string, unknown>;
  };
  type Html2Pdf = {
    set: (opts: Html2PdfOptions) => Html2Pdf;
    from: (el: HTMLElement) => Html2Pdf;
    save: () => Promise<void>;
  };
  const html2pdf: () => Html2Pdf;
  export default html2pdf;
}
