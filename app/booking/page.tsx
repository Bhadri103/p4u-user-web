import { redirect } from "next/navigation";

/** Taxi/hotel/flights booking module is hidden from the user app for now. */
export default function BookingRoute() {
  redirect("/shop");
}
