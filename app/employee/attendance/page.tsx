"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Employee from "../../attendance/employee/page"
// export default function EmployeeAttendanceRedirectPage() {
//   // const router = useRouter();

//   // useEffect(() => {
//   //   router.replace("/attendance/employee");
//   // }, [router]);''

//   <Employee/>

//   return null;
// }

export default function EmployeeAttendanceRedirectPage() {
  return <Employee />;
}