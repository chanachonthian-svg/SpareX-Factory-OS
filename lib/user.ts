/** The signed-in user — used for email signatures, audit trails, quote requests, etc.
 *  Mirrors the top row of the Settings › Users table (the Admin account). In a real
 *  deployment this comes from the auth session; here it's a single-source mock. */
export const currentUser = {
  name: "Chanachon Thian",
  title: "Energy Engineer",
  titleTh: "วิศวกรพลังงาน",
  role: "Admin",
  email: "chanachon@sparex.co.th",
  phone: "+66 2 118 7000",
  plant: "Bangkok Plant 1",
  company: "SpareX FactoryOS",
};

/** Where quote requests are sent. */
export const SPAREX_SALES_EMAIL = "inquiry@sparexth.com";
