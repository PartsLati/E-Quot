import React from 'react';

interface SignatureStampProps {
  companyName?: string;
  signerName: string;
  signerRole: string;
  signerPhone: string;
  showStamp?: boolean;
}

export const SignatureStamp: React.FC<SignatureStampProps> = ({
  companyName = 'PT United Tractors, Tbk',
  signerName,
  signerRole,
  signerPhone,
  showStamp = true
}) => {
  return (
    <div className="text-[13px] text-black font-sans leading-snug">
      <p className="mb-0.5">Hormat kami</p>
      <p className="font-semibold mb-1">{companyName}</p>

      {/* Digital Stamp Only Area (Tanda tangan dihilangkan) */}
      <div className="relative h-14 w-64 my-2 select-none flex items-center">
        {showStamp && (
          <div className="select-none flex items-center">
            <span className="text-[#1E88E5] font-black text-[17px] tracking-wide uppercase font-sans drop-shadow-2xs">
              PT UNITED TRACTORS Tbk
            </span>
          </div>
        )}
      </div>

      {/* Signer Info */}
      <div className="font-sans">
        <p className="font-bold text-[13.5px] text-black leading-tight">{signerName}</p>
        <p className="text-[12.5px] text-gray-800 leading-tight mt-0.5">{signerRole}</p>
        {signerPhone && (
          <p className="text-[12.5px] text-gray-800 leading-tight mt-0.5">{signerPhone}</p>
        )}
      </div>
    </div>
  );
};

