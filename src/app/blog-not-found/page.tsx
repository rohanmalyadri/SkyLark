import { notFound } from "next/navigation";

/**
 * Always a 404. The proxy rewrites requests for blog slugs that do not exist onto this
 * route, so a dead article URL answers with a real 404 status and the site's own not-found
 * page on the very first request — rather than the 200 shell a dynamic segment would stream.
 */
export default function BlogNotFound() {
  notFound();
}
