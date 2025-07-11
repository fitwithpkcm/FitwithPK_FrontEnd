import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { format, parse, parseISO } from 'date-fns';
import PhotoViewer from './photo-viewer';
import { ProgressPhoto } from './weekly-track-view';


interface Photo {
  id: number;
  date: string;
  imageUrl: string;
}

interface AllPhotosViewProps {
  userId: number;
  allPhotos: ProgressPhoto[],
  onBack: () => void;
}

// Sample user data
const USERS = [
  {
    id: 1,
    name: "John Doe",
    avatar: "https://ui-avatars.com/api/?name=John+Doe&background=random",
  },
  {
    id: 2,
    name: "Jane Smith",
    avatar: "https://ui-avatars.com/api/?name=Jane+Smith&background=random",
  },
  {
    id: 3,
    name: "Mike Johnson",
    avatar: "https://ui-avatars.com/api/?name=Mike+Johnson&background=random",
  },
  {
    id: 4,
    name: "Sarah Williams",
    avatar: "https://ui-avatars.com/api/?name=Sarah+Williams&background=random",
  },
  {
    id: 5,
    name: "Alex Brown",
    avatar: "https://ui-avatars.com/api/?name=Alex+Brown&background=random",
  }
];

// Generate a larger set of sample photos for the view
const generateSamplePhotos = (userId: number): ProgressPhoto[] => {
  const photos: Photo[] = [];

  // Generate sample photos for the past 12 months (1 per month)
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);

    // Add 2-3 photos per month for variety
    for (let j = 0; j < Math.floor(Math.random() * 2) + 2; j++) {
      const day = Math.floor(Math.random() * 28) + 1; // Random day in month
      date.setDate(day);

      photos.push({
        id: photos.length + 1,
        date: format(date, 'yyyy-MM-dd'),
        imageUrl: `https://ui-avatars.com/api/?name=${format(date, 'MMM+d')}&size=200&background=random&seed=${userId + photos.length}`,
      });
    }
  }

  // Sort by date (newest first)
  return photos.sort((a, b) =>
    parseISO(b.date).getTime() - parseISO(a.date).getTime()
  );
};

// Group photos by month
const groupPhotosByMonth = (photos: ProgressPhoto[]) => {
  const grouped: { [key: string]: ProgressPhoto[] } = {};

  photos.forEach(photo => {
    // Parse the date from dd-MM-yyyy format
    const date = parse((photo.date ? photo.date : "03-03-1993"), 'dd-MM-yyyy', new Date());
    const monthYear = format(date, 'MMMM yyyy');

    if (!grouped[monthYear]) {
      grouped[monthYear] = [];
    }
    grouped[monthYear].push(photo);
  });

  return grouped;
};

export default function AllPhotosView({ userId, allPhotos, onBack }: AllPhotosViewProps) {
  const [user, setUser] = useState<any>(null);
  const [photos, setPhotos] = useState<ProgressPhoto[]>(allPhotos ? allPhotos : []);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const handlePhotoClick = (photo: ProgressPhoto) => {
    setSelectedPhoto(photo);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
  };

  // Group photos by month
  const groupedPhotos = groupPhotosByMonth(photos);

  // Format date for display
  const formatPhotoDate = (dateString: string) => {
    const parsedDate = parse(dateString, 'dd-MM-yyyy', new Date());
    return format(parsedDate, 'd MMM');
  };

  return (
    <div className="h-full w-full">
      {/* Header (no back button needed since it's in a popup) */}
      <div className="mb-4">
        <div>
          {<p className="text-sm text-gray-400 mb-2">Basil</p>}
        </div>
      </div>

      {/* Photos by month */}
      <div className="space-y-8">
        {Object.entries(groupedPhotos).map(([month, monthPhotos]) => (
          <div key={month}>
            <h2 className="text-lg font-medium mb-3 text-white">{month}</h2>
            <div className="grid grid-cols-3 gap-3">
              {monthPhotos.map(photo => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                  onClick={() => handlePhotoClick(photo)}
                >
                  <img
                    src={photo.imageUrl}
                    alt={`Progress photo from ${formatPhotoDate(photo.date!)}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-60 px-2 py-1">
                    <p className="text-white text-xs">{formatPhotoDate(photo.date!)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* No photos message */}
      {photos.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No progress photos available</p>
        </div>
      )}

      {/* Photo viewer modal */}
      {viewerOpen && selectedPhoto && (
        <PhotoViewer
          photos={photos}
          initialIndex={photos.findIndex(p => p.id === selectedPhoto.id)}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  );
}