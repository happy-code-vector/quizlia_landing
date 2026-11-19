// Minimal types for the qrcode package (no @types package is installed). Only toString is used.
declare module "qrcode" {
  const QRCode: {
    toString(text: string, options?: Record<string, unknown>): Promise<string>
  }
  export default QRCode
}
