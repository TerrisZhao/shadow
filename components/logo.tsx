import Image from "next/image";

export const Logo = () => {
  return (
    <Image
      alt="Shadow Logo"
      className="rounded-md"
      height={32}
      src="/shadow.png"
      width={32}
    />
  );
};
