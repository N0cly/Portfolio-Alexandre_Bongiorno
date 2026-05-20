"use client";

import ReactMarkdown from "react-markdown";

export function MarkdownText({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        a: ({ href, children, ...rest }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:opacity-70"
            {...rest}
          >
            {children}
          </a>
        ),
        p: ({ children }) => <p className="leading-relaxed">{children}</p>,
        em: ({ children }) => <em className="italic">{children}</em>,
        strong: ({ children }) => (
          <strong className="font-medium">{children}</strong>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
