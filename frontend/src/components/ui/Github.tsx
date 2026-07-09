import React from 'react';

export function Github(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 24, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.6-.2-1.4-.7-2.6-1.5-3.6.2-.8.2-2 0-3.4 0 0-1-.3-3.3 1.2a11.5 11.5 0 0 0-6 0c-2.3-1.5-3.3-1.2-3.3-1.2-.2 1.4-.2 2.6 0 3.4-.8 1-1.3 2.2-1.5 3.6 0 3.6 3 5.6 6 5.6a4.8 4.8 0 0 0-1 3.2v4" />
      <path d="M9 18c-4.5 1.5-5-2.5-7-3" />
    </svg>
  );
}
