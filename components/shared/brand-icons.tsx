import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function GitHubIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12.05c0 5.1 3.29 9.42 7.86 10.95.58.1.79-.25.79-.56v-2.1c-3.2.7-3.88-1.4-3.88-1.4-.53-1.35-1.3-1.71-1.3-1.71-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.21 1.79 1.21 1.04 1.79 2.73 1.27 3.4.97.1-.76.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.72 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.77 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.24 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.45-2.7 5.42-5.26 5.71.42.36.79 1.07.79 2.16v3.2c0 .32.2.67.8.56 4.56-1.53 7.85-5.85 7.85-10.95A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M18.9 2H22l-6.77 7.73L22.6 22h-6.3l-4.4-6-5.06 6H2l7.1-8.1L1.7 2h6.44l4.06 5.58L18.9 2Zm-1.1 18h1.74L7.3 3.9H5.44L17.8 20Z" />
    </svg>
  );
}

export function LinkedInIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.64h.06A4.2 4.2 0 0 1 17.6 8.7c3 0 3.4 1.9 3.4 4.4V21h-4v-6.46c0-1.54-.03-3.52-2.15-3.52-2.15 0-2.48 1.67-2.48 3.4V21h-4V9Z" />
    </svg>
  );
}
