"use client";

import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className={`input-wrapper ${className}`}>
        <label className="input-label" htmlFor={props.id || props.name}>
          {label}
        </label>
        <input
          ref={ref}
          className={`input-field ${error ? "input-error" : ""}`}
          {...props}
        />
        {error && <span className="error-text">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
