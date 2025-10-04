import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

declare module "next-auth" {
  interface User {
    id: string;
  }
}
