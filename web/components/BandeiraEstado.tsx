"use client";

interface Props {
  src: string;
  alt: string;
  className?: string;
}

export default function BandeiraEstado({ src, alt, className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}
