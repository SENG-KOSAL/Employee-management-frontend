"use client";

import React from "react";

export const PayslipStyles = () => {
  return (
    <style jsx global>{`
      @page {
        size: A4;
        margin: 12mm;
      }
      @media print {
        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          background: #fff;
          color: #000;
        }
        * {
          box-shadow: none !important;
          text-shadow: none !important;
        }
        aside,
        header,
        nav,
        [data-sidebar],
        [data-sidebar-trigger],
        .sidebar,
        .Sidebar,
        .SidebarContent,
        .SidebarInset,
        .SidebarProvider,
        .SidebarTrigger {
          display: none !important;
          visibility: hidden !important;
        }
        main {
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          width: 100% !important;
        }
        .print-container {
          max-width: 100% !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          background: #fff !important;
        }
        .page-break {
          page-break-after: always;
        }
        .print-container table,
        .print-container tr,
        .print-container td,
        .print-container th {
          page-break-inside: avoid;
        }
      }
    `}</style>
  );
};
