"use client";

import * as React from "react";
import {
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  Loader2,
} from "lucide-react";

/** Simple wrappers so the rest of the app can import consistent names */
export const PencilIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <Pencil className={className} {...props} />
);

export const TrashIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <Trash2 className={className} {...props} />
);

export const ChevronDownIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <ChevronDown className={className} {...props} />
);

export const ChevronRightIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <ChevronRight className={className} {...props} />
);

export const PlusIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <Plus className={className} {...props} />
);

export const SpinnerIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <Loader2 className={`animate-spin ${className ?? ""}`} {...props} />
);
