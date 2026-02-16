import React from 'react';
import { Asset, Employee, Location } from '@/types/asset';
import { format } from 'date-fns';

interface AssetHandoverFormProps {
    type: 'employee' | 'location';
    details: Employee | Location;
    assets: Asset[];
    handedOverBy?: string; // Could be the current user
}

export const AssetHandoverForm: React.FC<AssetHandoverFormProps> = ({
    type,
    details,
    assets,
    handedOverBy = '',
}) => {
    const currentDate = format(new Date(), 'yyyy-MM-dd');

    const getName = () => {
        if (type === 'employee') return (details as Employee).name;
        return (details as Location).name;
    };

    const getContactDisplay = () => {
        if (type === 'employee') return (details as Employee).email;
        return (details as Location).address || '';
    }

    const getLocationDisplay = () => {
        if (type === 'employee') return (details as Employee).location;
        return (details as Location).name;
    }

    return (
        <div className="w-full max-w-[210mm] mx-auto p-6 bg-white text-black font-sans leading-tight print:p-0 print:max-w-none">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
                <div className="w-20 h-20 flex items-center justify-center">
                    <img src="/logo.png" alt="Company Logo" className="w-full h-full object-contain" />
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold uppercase">IT AND TECH</h1>
                    <h2 className="text-xl font-bold uppercase">ASSET HANDOVER FORM</h2>
                </div>
                <div className="border-2 border-black px-2 py-1 font-bold text-sm">
                    INTERNAL USE ONLY
                </div>
            </div>

            {/* Hand Over Particulars */}
            <div className="mb-6">
                <div className="bg-gray-200 border-2 border-black font-bold text-center py-1 mb-2 uppercase text-sm">
                    Hand Over Particulars
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div className="flex items-center">
                        <span className="w-36 font-bold">Handed Over To:</span>
                        <div className="flex-1 border-2 border-black h-8 px-2 flex items-center font-medium">{getName()}</div>
                    </div>
                    <div className="flex items-center">
                        <span className="w-36 font-bold">Contact No.:</span>
                        <div className="flex-1 border-2 border-black h-8 px-2 flex items-center font-medium">{getContactDisplay()}</div>
                    </div>

                    <div className="flex items-center">
                        <span className="w-36 font-bold">Working Location:</span>
                        <div className="flex-1 border-2 border-black h-8 px-2 flex items-center font-medium">{getLocationDisplay()}</div>
                    </div>
                    <div className="flex items-center">
                        <span className="w-36 font-bold">Handover Date:</span>
                        <div className="flex-1 border-2 border-black h-8 px-2 flex items-center font-medium">{currentDate}</div>
                    </div>

                    <div className="flex items-center">
                        <span className="w-36 font-bold">Handed Over By:</span>
                        <div className="flex-1 border-2 border-black h-8 px-2 flex items-center font-medium">{handedOverBy}</div>
                    </div>
                    <div className="flex items-center">
                        <span className="w-36 font-bold">Return Date:</span>
                        <div className="flex-1 border-2 border-black h-8"></div>
                    </div>
                </div>
            </div>

            {/* Asset Description */}
            <div className="mb-6">
                <div className="bg-gray-200 border-2 border-black font-bold text-center py-1 mb-1 uppercase text-sm">
                    Asset Description
                </div>

                <table className="w-full border-collapse border-2 border-black text-sm">
                    <thead>
                        <tr className="text-center font-bold">
                            <th className="border-2 border-black p-2 w-1/6">Serial No.</th>
                            <th className="border-2 border-black p-2 w-1/4">Asset Name</th>
                            <th className="border-2 border-black p-2 w-1/6">Brand</th>
                            <th className="border-2 border-black p-2 w-10">Qty</th>
                            <th className="border-2 border-black p-0 w-28">
                                <div className="border-b-2 border-black p-1">Status</div>
                                <div className="flex">
                                    <div className="w-1/2 border-r-2 border-black p-1">New</div>
                                    <div className="w-1/2 p-1">Old</div>
                                </div>
                            </th>
                            <th className="border-2 border-black p-2">Remark</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map((asset, index) => (
                            <tr key={asset.id} className="h-10">
                                <td className="border-2 border-black p-2">{asset.serialNumber || asset.assetTag}</td>
                                <td className="border-2 border-black p-2">{asset.name}</td>
                                <td className="border-2 border-black p-2">{asset.model}</td>
                                <td className="border-2 border-black p-2 text-center">1</td>
                                <td className="border-2 border-black p-0">
                                    <div className="flex h-full">
                                        <div className="w-1/2 border-r-2 border-black"></div>
                                        <div className="w-1/2"></div>
                                    </div>
                                </td>
                                <td className="border-2 border-black p-2"></td>
                            </tr>
                        ))}
                        {/* Fill empty rows if needed but limit to save space */}
                        {Array.from({ length: Math.max(0, 5 - assets.length) }).map((_, i) => (
                            <tr key={`empty-${i}`} className="h-10">
                                <td className="border-2 border-black p-2"></td>
                                <td className="border-2 border-black p-2"></td>
                                <td className="border-2 border-black p-2"></td>
                                <td className="border-2 border-black p-2"></td>
                                <td className="border-2 border-black p-0">
                                    <div className="flex h-full">
                                        <div className="w-1/2 border-r-2 border-black"></div>
                                        <div className="w-1/2"></div>
                                    </div>
                                </td>
                                <td className="border-2 border-black p-2"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Acknowledgement */}
            <div className="mb-4">
                <div className="bg-gray-200 border-2 border-black font-bold text-center py-1 mb-2 uppercase text-xs">
                    Asset Handover Acknowledgement and Declaration By Requester
                </div>
                <p className="text-justify text-xs mb-3 leading-snug">
                    I hereby acknowledge that I have received the above listed assets from <b>School Style Supplies Pvt. Ltd.</b> in <b>good working condition</b>.
                    I understand that <b>I am solely responsible</b> for the safekeeping, proper use, and maintenance of these assets that I have received,
                    and <b>I shall remain liable</b> for any loss, damage, or misuse until the assets are duly returned to the company in good working condition.
                </p>

                <div className="border-2 border-black flex text-sm">
                    <div className="w-1/4 p-2 border-r-2 border-black h-12 flex items-center">
                        <span className="font-bold mr-2">Signature:</span>
                    </div>
                    <div className="w-1/4 p-2 border-r-2 border-black h-12 flex items-center">
                        <span className="font-bold mr-2">Name:</span>
                        <span className="truncate">{getName()}</span>
                    </div>
                    <div className="w-1/4 p-2 border-r-2 border-black h-12 flex items-center">
                        <span className="font-bold mr-2">E-Mail:</span>
                        <span className="truncate">{getContactDisplay()}</span>
                    </div>
                    <div className="w-1/4 p-2 h-12 flex items-center">
                        <span className="font-bold mr-2">Date:</span>
                    </div>
                </div>
            </div>

            {/* Returning Acknowledgement */}
            <div className="mb-4">
                <div className="bg-gray-200 border-2 border-black font-bold text-center py-1 mb-2 uppercase text-xs">
                    Asset Returning Acknowledgement and Declaration By Requester
                </div>
                <div className="border-2 border-black flex text-sm">
                    <div className="w-1/4 p-2 border-r-2 border-black h-12 flex items-center">
                        <span className="font-bold mr-2">Signature:</span>
                    </div>
                    <div className="w-1/4 p-2 border-r-2 border-black h-12 flex items-center">
                        <span className="font-bold mr-2">Name:</span>
                    </div>
                    <div className="w-1/4 p-2 border-r-2 border-black h-12 flex items-center">
                        <span className="font-bold mr-2">E-Mail:</span>
                    </div>
                    <div className="w-1/4 p-2 h-12 flex items-center">
                        <span className="font-bold mr-2">Date:</span>
                    </div>
                </div>
            </div>

            {/* Office Use */}
            <div className="mb-6">
                <div className="font-bold text-center py-1 mb-1 uppercase text-xs">
                    For Office Use Only
                </div>
                <div className="border-2 border-black flex text-sm">
                    <div className="w-1/2 p-2 border-r-2 border-black h-12 flex items-center">
                        <span className="font-bold mr-2">Asset Received By:</span>
                    </div>
                    <div className="w-1/2 p-2 h-12 flex items-center">
                        <span className="font-bold mr-2">Remark:</span>
                    </div>
                </div>
            </div>

            {/* Footer Signatures */}
            <div className="flex gap-4 text-sm break-inside-avoid">
                <div className="w-1/2 border-2 border-black p-2 h-32 flex flex-col justify-between">
                    <div className="font-bold">While Handing-Over</div>
                    <div className="space-y-6">
                        <div className="font-bold">Signature:</div>
                        <div className="font-bold">Date:</div>
                    </div>
                </div>
                <div className="w-1/2 border-2 border-black p-2 h-32 flex flex-col justify-between">
                    <div className="font-bold">While Returning</div>
                    <div className="space-y-6">
                        <div className="font-bold">Signature:</div>
                        <div className="font-bold">Date:</div>
                    </div>
                </div>
            </div>

            <style>{`
          @media print {
            body { 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
            }
            @page {
                size: A4;
                margin: 5mm;
            }
          }
       `}</style>
        </div>
    );
};
