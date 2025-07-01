import React,{ useState } from 'react';
import { X, ChevronLeft, ChevronRight, ArrowLeftRight, Maximize } from 'lucide-react';
import { format, parse, parseISO } from 'date-fns';

interface Photo {
  id: number;
  date: string;
  imageUrl: string;
}

interface PhotoViewerProps {
  photos: Photo[];
  initialIndex?: number;
  onClose: () => void;
}

export default function PhotoViewer({ photos, initialIndex = 0, onClose }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [compareMode, setCompareMode] = useState(false);
  const [compareWithIndex, setCompareWithIndex] = useState<number | null>(null);

  // Sort photos by date (most recent first) to make comparison easier
  const sortedPhotos = [...photos].sort((a, b) =>
    parseISO(b.date).getTime() - parseISO(a.date).getTime()
  );

  const currentPhoto = sortedPhotos[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex > 0 ? prevIndex - 1 : sortedPhotos.length - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex < sortedPhotos.length - 1 ? prevIndex + 1 : 0
    );
  };

  /*   const formatPhotoDate = (dateString: string) => {
      return format(parseISO(dateString), 'MMMM d, yyyy');
    }; */


  const formatPhotoDate = (dateString: string) => {
    const parsedDate = parse(dateString, 'dd-MM-yyyy', new Date());
    return format(parsedDate, 'd MMM');
  };


  // Toggle between compare mode and single photo mode
  const toggleCompareMode = () => {
    if (compareMode) {
      setCompareMode(false);
      setCompareWithIndex(null);
    } else {
      setCompareMode(true);
      // Default to comparing with the next most recent photo
      const nextIndex = currentIndex < sortedPhotos.length - 1 ? currentIndex + 1 : null;
      setCompareWithIndex(nextIndex);
    }
  };

  // Change which photo to compare with
  const changeComparePhoto = (index: number) => {
    if (index !== currentIndex) {
      setCompareWithIndex(index);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between text-white">
        <div>
          <h3 className="font-medium">
            {compareMode ? 'Compare Photos' : 'Progress Photo'}
          </h3>
          <p className="text-sm text-gray-300">
            {compareMode && compareWithIndex !== null
              ? `Comparing ${formatPhotoDate(currentPhoto.date)} with ${formatPhotoDate(sortedPhotos[compareWithIndex].date)}`
              : formatPhotoDate(currentPhoto.date)
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {sortedPhotos.length > 1 && (
            <button
              onClick={toggleCompareMode}
              className={`p-2 hover:bg-gray-800 rounded-full ${compareMode ? 'bg-blue-600' : ''}`}
              title={compareMode ? "Exit comparison mode" : "Compare photos"}
            >
              <ArrowLeftRight size={20} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Photo display area */}
      {!compareMode ? (
        // Single photo view
        <div className="flex-1 flex items-center justify-center relative">
          <img
            src={currentPhoto.imageUrl}
            alt={`Progress photo from ${currentPhoto.date}`}
            className="max-h-full max-w-full object-contain"
          />

          {/* Navigation buttons */}
          {sortedPhotos.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 p-3 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70"
              >
                <ChevronLeft size={24} />
              </button>

              <button
                onClick={handleNext}
                className="absolute right-4 p-3 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      ) : (
        // Compare view - side by side photos
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-center relative overflow-hidden">
          {compareWithIndex !== null && (
            <>
              <div className="flex-1 h-1/2 sm:h-full flex items-center justify-center p-2 relative">
                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-md">
                  Current: {formatPhotoDate(currentPhoto.date)}
                </div>
                <img
                  src={currentPhoto.imageUrl}
                  alt={`Current: ${formatPhotoDate(currentPhoto.date)}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex-1 h-1/2 sm:h-full flex items-center justify-center p-2 relative">
                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-md">
                  Compared: {formatPhotoDate(sortedPhotos[compareWithIndex].date)}
                </div>
                <img
                  src={sortedPhotos[compareWithIndex].imageUrl}
                  alt={`Compared: ${formatPhotoDate(sortedPhotos[compareWithIndex].date)}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Thumbnail navigation */}
      <div className="p-4 bg-black bg-opacity-50">
        <div className="flex space-x-2 overflow-x-auto py-2">
          {sortedPhotos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => compareMode && compareWithIndex !== null
                ? changeComparePhoto(index)
                : setCurrentIndex(index)
              }
              className={`w-16 h-16 flex-shrink-0 rounded overflow-hidden ${compareMode
                  ? (compareWithIndex === index ? 'ring-2 ring-yellow-500' : index === currentIndex ? 'ring-2 ring-blue-500' : '')
                  : (index === currentIndex ? 'ring-2 ring-blue-500' : '')
                }`}
            >
              <img
                src={photo.imageUrl}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-[10px] py-1 px-1 text-center truncate">
                {
                  formatPhotoDate(photo.date)

                }
              </div>
            </button>
          ))}
        </div>
        {compareMode && (
          <div className="mt-2 text-center text-white text-sm">
            <p>Click a thumbnail to compare with the current photo</p>
          </div>
        )}
      </div>
    </div>
  );
}