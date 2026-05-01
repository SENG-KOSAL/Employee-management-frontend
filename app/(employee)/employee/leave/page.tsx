"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import EmployeeLeave from "../../leave-requests/employee/page"
// export default function EmployeeLeaveRedirectPage() {
//   const router = useRouter();

//   useEffect(() => {
//     router.replace("/leave-requests/employee");
//   }, [router]);

//   return null;
// }

export default function EmployeeLeaveRedirectPage() {
  // const router = useRouter();

  // useEffect(() => {
  //   router.replace("/leave-requests/employee");
  // }, [router]);

  return <EmployeeLeave/> ;
}
