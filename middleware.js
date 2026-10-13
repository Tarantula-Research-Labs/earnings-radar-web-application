// The site no longer has a login. This file is kept only as a harmless placeholder
// (it matches a path nothing uses) and can be deleted: `git rm middleware.js`.
import { NextResponse } from "next/server";

export const config = { matcher: ["/__unused-placeholder"] };

export function middleware() {
  return NextResponse.next();
}
