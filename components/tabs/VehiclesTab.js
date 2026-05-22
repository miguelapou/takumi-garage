import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, ChevronDown, ChevronRight, GripVertical,
  Car, Archive, Package, ListChecks, FolderLock, FolderOpen, Camera
} from 'lucide-react';
import { getMutedColor, getPriorityBorderColor } from '../../utils/colorUtils';
import { cardBg } from '../../utils/styleUtils';
import AddVehicleModal from '../modals/AddVehicleModal';
import VehicleDetailModal from '../modals/VehicleDetailModal';
import FadeInImage from '../ui/FadeInImage';

const VehiclesTab = ({
  tabContentRef,
  vehicles,
  projects,
  darkMode,
  layoutMode,
  draggedVehicle,
  setDraggedVehicle,
  dragOverVehicle,
  setDragOverVehicle,
  dragOverArchiveZone,
  setDragOverArchiveZone,
  isArchiveCollapsed,
  setIsArchiveCollapsed,
  archiveRef,
  setShowAddVehicleModal,
  setShowVehicleDetailModal,
  setViewingVehicle,
  vehicleModalEditMode,
  setVehicleModalEditMode,
  handleVehicleDragStart,
  handleVehicleDragOver,
  handleVehicleDragLeave,
  handleVehicleDrop,
  handleVehicleDragEnd,
  handleArchiveZoneDrop,
  getVehicleProjects,
  // Additional props needed for modals
  showAddVehicleModal,
  showVehicleDetailModal,
  viewingVehicle,
  setOriginalVehicleData,
  originalVehicleData,
  newVehicle,
  setNewVehicle,
  vehicleImagePreview,
  setVehicleImagePreview,
  vehicleImageFile,
  setVehicleImageFile,
  uploadingImage,
  setUploadingImage,
  isDraggingImage,
  setIsDraggingImage,
  isModalClosing,
  handleCloseModal,
  addVehicle,
  uploadVehicleImage,
  clearImageSelection,
  handleImageFileChange,
  handleImageDragEnter,
  handleImageDragLeave,
  handleImageDragOver,
  handleImageDrop,
  // Multi-image props
  vehicleImageFiles,
  setVehicleImageFiles,
  MAX_VEHICLE_IMAGES,
  addImageFile,
  removeImageFile,
  setPrimaryImageFile,
  uploadMultipleVehicleImages,
  deleteVehicleImageFromStorage,
  getPrimaryImageUrl,
  vehicleModalProjectView,
  setVehicleModalProjectView,
  parts,
  vendorColors,
  editingTodoId,
  setEditingTodoId,
  editingTodoText,
  setEditingTodoText,
  newTodoText,
  setNewTodoText,
  hasUnsavedVehicleChanges,
  updateVehicle,
  deleteVehicle,
  loadVehicles,
  updateProject,
  unlinkPartFromProject,
  loadProjects,
  loadParts,
  addProject,
  createPartDirectly,
  deleteProject,
  deletePart,
  setConfirmDialog,
  getStatusColors,
  getPriorityColors,
  getStatusText,
  getStatusTextColor,
  getVendorColor,
  calculateProjectTotal,
  calculateProjectStatus,
  toast,
  setActiveTab,
  archivePart,
  onAddPartFromProject,
  setShowPartDetailModal,
  setViewingPart
  // Document and service event props removed - now handled via context in VehicleDetailModal
}) => {
  // Track layout transitions for animation
  const [transitionDirection, setTransitionDirection] = useState(null);
  const previousLayoutRef = useRef(layoutMode);

  // Detect layout changes and trigger animation
  useEffect(() => {
    if (previousLayoutRef.current !== layoutMode) {
      // Set direction based on which layout we're transitioning to
      setTransitionDirection(layoutMode === 'compact' ? 'to-compact' : 'to-default');
      previousLayoutRef.current = layoutMode;
      // Remove animation class after animation completes
      const timer = setTimeout(() => {
        setTransitionDirection(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [layoutMode]);

  // State for adding demo data
  const [addingDemoData, setAddingDemoData] = useState(false);

  // Calculate max badges for compact mode based on available image height
  const [compactBadgeLimit, setCompactBadgeLimit] = useState(3);

  useEffect(() => {
    const calculateBadgeLimit = () => {
      const width = window.innerWidth;
      // Estimate card width based on grid breakpoints (1 col < 768px, 2 cols < 1024px, 3 cols >= 1024px)
      // Account for container padding (~48px) and gap between cards (~24px)
      let cardWidth;
      if (width < 768) {
        cardWidth = width - 48; // Single column, full width minus padding
      } else if (width < 1024) {
        cardWidth = (width - 48 - 24) / 2; // 2 columns
      } else {
        cardWidth = (width - 48 - 48) / 3; // 3 columns
      }

      // Image is 50% of card width (w-1/2), minus internal padding (~32px for px-6 and gap-4)
      const imageWidth = (cardWidth - 32) / 2;
      // Since aspect-square, height equals width
      const imageHeight = imageWidth;

      // Available height = image height - header (~24px) - potential "+more" indicator (~20px)
      const availableHeight = imageHeight - 24 - 20;
      // Each badge is ~26px tall (py-1 = 8px + text ~12px + gap-1.5 = 6px)
      const badgeHeight = 26;

      const maxBadges = Math.max(1, Math.floor(availableHeight / badgeHeight));
      setCompactBadgeLimit(Math.min(maxBadges, 5)); // Cap at 5 to avoid showing too many
    };

    calculateBadgeLimit();
    window.addEventListener('resize', calculateBadgeLimit);
    return () => window.removeEventListener('resize', calculateBadgeLimit);
  }, []);

  // Add demo vehicle with project and parts
  const handleAddDemoData = async () => {
    setAddingDemoData(true);
    try {
      // Demo vehicle data (Samwise - Land Cruiser)
      const demoVehicle = {
        name: "Land Cruiser",
        nickname: "Samwise",
        make: "Toyota",
        year: "1995",
        license_plate: "ABC-123",
        vin: "HZJ73-0005847",
        color: "#77bb41",
        odometer_range: "100000",
        odometer_unit: "km",
        purchase_price: "22654",
        purchase_date: "2025-10-15",
        insurance_policy: "Progressive",
        fuel_filter: "Wix 33138 (23303-64010)",
        air_filter: "(17801-68020)",
        oil_filter: "Wix 57254 (90915-30002)",
        oil_type: "15w-40",
        oil_capacity: "9.3 liters",
        oil_brand: "Shell Rotella",
        drain_plug: "14mm",
        battery: "--",
        image_url: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&h=600&fit=crop",
        images: [
          { url: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&h=600&fit=crop", isPrimary: true }
        ]
      };

      // Add the vehicle first (skip reload to avoid flashing)
      const newVehicle = await addVehicle(demoVehicle, { skipReload: true });
      if (!newVehicle?.id) {
        throw new Error('Failed to create vehicle');
      }

      // Demo project data (Fluids)
      const demoProject = {
        name: "Fluids",
        description: "Regular maintenance and upgrades to engine components.",
        budget: 1500,
        priority: "high",
        vehicle_id: newVehicle.id
      };

      // Add the project (skip reload to avoid flashing)
      const newProject = await addProject(demoProject, { skipReload: true });
      if (!newProject?.id) {
        throw new Error('Failed to create project');
      }

      // Demo parts for the Fluids project
      const demoParts = [
        { part: "Fuel Filter", partNumber: "23303-64010", vendor: "Toyota", price: 15.93, shipping: 0, duties: 0, purchased: true, shipped: true, delivered: true, projectId: newProject.id },
        { part: "Oil Filter x 2", partNumber: "90915-30002", vendor: "Toyota", price: 36.77, shipping: 0, duties: 0, purchased: true, shipped: true, delivered: true, projectId: newProject.id },
        { part: "Air Filter", partNumber: "17801-68020", vendor: "Toyota", price: 21.24, shipping: 0, duties: 0, purchased: true, shipped: true, delivered: true, projectId: newProject.id },
        { part: "Oil Plug Gaskets", partNumber: "90430-12031", vendor: "Amazon", price: 10.70, shipping: 0, duties: 0, purchased: true, shipped: true, delivered: true, projectId: newProject.id }
      ];

      // Add all parts
      for (const part of demoParts) {
        await createPartDirectly(part);
      }

      // Reload vehicles and projects to refresh the UI
      await loadVehicles();
      await loadProjects();

      toast?.success('Demo vehicle added successfully!');
    } catch (error) {
      console.error('Error adding demo data:', error);
      toast?.error('Failed to add demo vehicle. Please try again.');
    } finally {
      setAddingDemoData(false);
    }
  };

  return (
    <div
      ref={tabContentRef}
      className="slide-in-right"
    >
      <>
        {/* Active Vehicles Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${
          transitionDirection ? `vehicles-layout-transition ${transitionDirection}` : ''
        }`}>
          {vehicles.filter(v => !v.archived).map((vehicle) => {
            const borderColor = getMutedColor(vehicle.color, darkMode);
            return (
            <div
              key={vehicle.id}
              data-vehicle-id={vehicle.id}
              onDragOver={(e) => handleVehicleDragOver(e, vehicle)}
              onDragLeave={handleVehicleDragLeave}
              onDrop={(e) => handleVehicleDrop(e, vehicle)}
              onClick={() => {
                setViewingVehicle(vehicle);
                setOriginalVehicleData({ ...vehicle }); // Save original data for unsaved changes check
                setShowVehicleDetailModal(true);
              }}
              className={`relative flex flex-col rounded-lg shadow-lg pt-4 ${vehicle.archived ? 'pb-3' : 'pb-4'} px-6 transition-[transform,box-shadow] duration-200 hover:shadow-2xl hover:scale-[1.03] cursor-pointer overflow-hidden ${
                draggedVehicle?.id === vehicle.id
                  ? 'ring-2 ring-blue-500 ring-offset-2'
                  : dragOverVehicle?.id === vehicle.id
                    ? (darkMode ? 'ring-2 ring-blue-500' : 'ring-2 ring-blue-400')
                    : ''
              } ${cardBg(darkMode)}`}
            >
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: borderColor }} />
              {/* Drag Handle - Hidden on touch devices */}
              <div
                draggable
                onClick={(e) => e.stopPropagation()}
                onDragStart={(e) => {
                  e.stopPropagation();
                  handleVehicleDragStart(e, vehicle);
                  // Set the entire card as the drag image, positioned at top-left
                  const card = e.currentTarget.closest('[data-vehicle-id]');
                  if (card) {
                    // Position the drag image so cursor is at the grip icon location (top-left area)
                    e.dataTransfer.setDragImage(card, 20, 20);
                  }
                }}
                onDragEnd={handleVehicleDragEnd}
                className={`drag-handle absolute top-2 left-2 cursor-grab active:cursor-grabbing ${
                  darkMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <GripVertical className="w-5 h-5" />
              </div>

              {layoutMode === 'compact' ? (
                /* ========== COMPACT LAYOUT ========== */
                <div className="flex flex-col flex-1">
                  {/* Top row: Thumbnail + Projects side by side (50/50 split) — grows to fill */}
                  <div className="flex gap-4 mt-2 md:mt-8 flex-1">
                    {/* Thumbnail Column - 50% */}
                    <div className="w-1/2 flex-shrink-0">
                      {(vehicle.image_url_resolved || vehicle.image_url) ? (
                        <FadeInImage
                          src={vehicle.image_url_resolved || vehicle.image_url}
                          alt={vehicle.nickname || vehicle.name}
                          loading="lazy"
                          decoding="async"
                          className={`w-full aspect-square object-cover rounded-lg border ${
                            darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'
                          }`}
                        />
                      ) : (
                        <div className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center border ${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'
                        }`}>
                          <Camera className={`w-8 h-8 opacity-40 ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                        </div>
                      )}
                    </div>

                    {/* Projects Column - 50% */}
                    <div className="w-1/2 min-w-0">
                      {(() => {
                        const vehicleProjects = getVehicleProjects(vehicle.id);
                        return (
                          <>
                            <h4 className={`text-xs font-semibold mb-2 uppercase tracking-wider ${
                              darkMode ? 'text-gray-400' : 'text-slate-600'
                            }`}>
                              Projects
                            </h4>
                            {vehicleProjects.length > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {vehicleProjects.slice(0, compactBadgeLimit).map((project) => (
                                  <span
                                    key={project.id}
                                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                                      darkMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300'
                                    }`}
                                    style={{
                                      borderLeftWidth: '3px',
                                      borderLeftColor: getPriorityBorderColor(project.priority)
                                    }}
                                  >
                                    <ListChecks className="w-3 h-3 mr-1 flex-shrink-0" />
                                    <span className="truncate">{project.name}</span>
                                  </span>
                                ))}
                                {vehicleProjects.length > compactBadgeLimit && (
                                  <span className={`text-xs text-center ${
                                    darkMode ? 'text-gray-500' : 'text-gray-600'
                                  }`}>
                                    +{vehicleProjects.length - compactBadgeLimit} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 py-1">
                                <ListChecks className={`w-4 h-4 opacity-40 ${
                                  darkMode ? 'text-gray-400' : 'text-gray-500'
                                }`} />
                                <span className={`text-xs ${
                                  darkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                  No projects linked
                                </span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Bottom: Vehicle name/badge separated by horizontal line */}
                  <div className={`mt-4 pt-3 border-t ${
                    darkMode ? 'border-gray-700' : 'border-slate-300'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-lg font-bold truncate ${
                        darkMode ? 'text-gray-100' : 'text-slate-800'
                      }`}>
                        {vehicle.nickname || [vehicle.year, vehicle.make, vehicle.name].filter(Boolean).join(' ')}
                      </h3>
                      {vehicle.nickname && [vehicle.year, vehicle.make, vehicle.name].filter(Boolean).length > 0 && (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 text-white"
                          style={{ backgroundColor: vehicle.color || '#3B82F6' }}
                        >
                          {[vehicle.year, vehicle.make, vehicle.name].filter(Boolean).join(' ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* ========== DEFAULT LAYOUT ========== */
                <>
                  {/* Vehicle Image */}
                  {(vehicle.image_url_resolved || vehicle.image_url) ? (
                    <div className="mb-4 mt-2 md:mt-10 relative">
                      <FadeInImage
                        src={vehicle.image_url_resolved || vehicle.image_url}
                        alt={vehicle.nickname || vehicle.name}
                        loading="lazy"
                        decoding="async"
                        className={`w-full h-48 object-cover rounded-lg border ${
                          vehicle.archived
                            ? 'grayscale opacity-40'
                            : ''
                        } ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'}`}
                      />
                      {vehicle.archived && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-2xl font-bold px-6 py-2 rounded-lg ${
                            darkMode
                              ? 'bg-gray-900/80 text-gray-300 border-2 border-gray-600'
                              : 'bg-white/80 text-gray-700 border-2 border-gray-400'
                          }`} style={{ fontFamily: "'FoundationOne', 'Courier New', monospace" }}>
                            ARCHIVED
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-4 mt-2 md:mt-10 w-full h-48 rounded-lg flex flex-col items-center justify-center">
                      <Camera className={`w-12 h-12 mb-2 opacity-40 ${
                        darkMode ? 'text-gray-600' : 'text-gray-400'
                      }`} />
                      <p className={`text-sm ${
                        darkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        No image
                      </p>
                    </div>
                  )}

                  {/* Vehicle Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`text-xl font-bold ${
                        darkMode ? 'text-gray-100' : 'text-slate-800'
                      }`}>
                        {vehicle.nickname || [vehicle.year, vehicle.make, vehicle.name].filter(Boolean).join(' ')}
                      </h3>
                      {vehicle.nickname && [vehicle.year, vehicle.make, vehicle.name].filter(Boolean).length > 0 && (
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 text-white"
                          style={{ backgroundColor: vehicle.color || '#3B82F6' }}
                        >
                          {[vehicle.year, vehicle.make, vehicle.name].filter(Boolean).join(' ')}
                        </span>
                      )}
                    </div>
                    {!vehicle.archived && (
                      <>
                        {/* Project Badges */}
                        {(() => {
                          const vehicleProjects = getVehicleProjects(vehicle.id);
                          return (
                            <div className={`mt-4 pt-4 border-t ${
                              darkMode ? 'border-gray-700' : 'border-slate-300'
                            }`}>
                              <h4 className={`text-xs font-semibold mb-2 uppercase tracking-wider ${
                                darkMode ? 'text-gray-400' : 'text-slate-600'
                              }`}>
                                Projects
                              </h4>
                              {vehicleProjects.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {vehicleProjects.slice(0, 4).map((project) => (
                                    <span
                                      key={project.id}
                                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                                        darkMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300'
                                      }`}
                                      style={{
                                        borderLeftWidth: '3px',
                                        borderLeftColor: getPriorityBorderColor(project.priority),
                                        width: 'calc(50% - 4px)'
                                      }}
                                    >
                                      <ListChecks className="w-3 h-3 mr-1 flex-shrink-0" />
                                      <span className="truncate">{project.name}</span>
                                    </span>
                                  ))}
                                  {vehicleProjects.length > 4 && (
                                    <div className="w-full text-center mt-1">
                                      <span className={`text-xs ${
                                        darkMode ? 'text-gray-500' : 'text-gray-600'
                                      }`}>
                                        +{vehicleProjects.length - 4} more
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-2">
                                  <ListChecks className={`w-6 h-6 mx-auto mb-1 opacity-40 ${
                                    darkMode ? 'text-gray-400' : 'text-gray-500'
                                  }`} />
                                  <p className={`text-xs ${
                                    darkMode ? 'text-gray-400' : 'text-gray-500'
                                  }`}>
                                    No projects linked
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          );
          })}
        </div>

        {/* Empty State - No unarchived vehicles */}
        {vehicles.filter(v => !v.archived).length === 0 && vehicles.length > 0 && (
          <div className={`text-center py-12 rounded-lg ${cardBg(darkMode)}`}>
            <Car className={`w-16 h-16 mx-auto mb-4 ${
              darkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <h3 className={`text-xl font-semibold mb-2 ${
              darkMode ? 'text-gray-300' : 'text-slate-700'
            }`}>
              No Active Vehicles
            </h3>
            <p className={`mb-4 ${
              darkMode ? 'text-gray-400' : 'text-slate-600'
            }`}>
              All vehicles are archived
            </p>
            <button
              onClick={() => setShowAddVehicleModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-md transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add a vehicle
            </button>
          </div>
        )}

        {/* Empty State - No vehicles at all */}
        {vehicles.length === 0 && (
          <div className={`text-center py-12 rounded-lg ${cardBg(darkMode)}`}>
            <Car className={`w-16 h-16 mx-auto mb-4 ${
              darkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <h3 className={`text-xl font-semibold mb-2 ${
              darkMode ? 'text-gray-300' : 'text-slate-700'
            }`}>
              No Vehicles Yet
            </h3>
            <p className={`mb-4 ${
              darkMode ? 'text-gray-400' : 'text-slate-600'
            }`}>
              Add your first vehicle to track maintenance and information
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                onClick={() => setShowAddVehicleModal(true)}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-md transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Add a vehicle
              </button>
              <button
                onClick={handleAddDemoData}
                disabled={addingDemoData}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg shadow-md transition-colors font-medium ${
                  addingDemoData
                    ? 'bg-yellow-400 cursor-not-allowed opacity-70'
                    : 'bg-yellow-500 hover:bg-yellow-600'
                } text-gray-900`}
              >
                <Car className="w-5 h-5" />
                {addingDemoData ? 'Adding...' : 'Add demo vehicle'}
              </button>
            </div>
          </div>
        )}

        {/* Archived Vehicles Section */}
        <>
          <div className={`my-8 border-t ${
            darkMode ? 'border-gray-700' : 'border-slate-300'
          }`}>
            {/* Archive Drop Zone - appears when dragging an active vehicle */}
            {draggedVehicle && !draggedVehicle.archived && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverArchiveZone(true);
                }}
                onDragLeave={() => setDragOverArchiveZone(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleArchiveZoneDrop(true);
                }}
                className={`drag-handle mt-8 mb-6 p-6 rounded-lg border-2 border-dashed transition-all ${
                  dragOverArchiveZone
                    ? darkMode
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-blue-600 bg-blue-100/50'
                    : darkMode
                      ? 'border-gray-600 bg-gray-800/50'
                      : 'border-gray-300 bg-gray-100/50'
                }`}
              >
                <p className={`text-center text-sm ${
                  dragOverArchiveZone
                    ? darkMode ? 'text-blue-400' : 'text-blue-600'
                    : darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Drop here to archive
                </p>
              </div>
            )}

            <div
              className={`flex items-center gap-2 ${draggedVehicle && !draggedVehicle.archived ? '' : 'mt-8'} mb-6 cursor-pointer select-none transition-colors ${
                darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-slate-700 hover:text-slate-900'
              }`}
              onClick={() => {
                const wasCollapsed = isArchiveCollapsed;
                setIsArchiveCollapsed(!isArchiveCollapsed);
                // If opening the archive, scroll to bottom of page after a brief delay to allow expansion
                if (wasCollapsed) {
                  setTimeout(() => {
                    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
                  }, 100);
                }
              }}
            >
              {isArchiveCollapsed ? <FolderLock className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
              <h2 className="text-lg font-semibold">
                Archive
              </h2>
              <ChevronRight
                className={`w-5 h-5 transition-transform duration-300 ${
                  isArchiveCollapsed ? '' : 'rotate-90'
                }`}
              />
            </div>
          </div>

          <div
            ref={archiveRef}
            className={`transition-all duration-300 ease-in-out ${
              isArchiveCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[5000px] opacity-100 overflow-visible'
            }`}
          >
            {vehicles.filter(v => v.archived).length > 0 ? (
              <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {vehicles.filter(v => v.archived).map((vehicle) => {
                const borderColor = getMutedColor(vehicle.color, darkMode);
                return (
                <div
                  key={vehicle.id}
                  onClick={() => {
                    setViewingVehicle(vehicle);
                    setOriginalVehicleData({ ...vehicle }); // Save original data for unsaved changes check
                    setShowVehicleDetailModal(true);
                  }}
                  className={`relative rounded-lg shadow-lg pt-3 pb-2 px-3 transition-[transform,box-shadow] duration-200 hover:shadow-2xl hover:scale-[1.03] cursor-pointer overflow-hidden ${cardBg(darkMode)}`}
                >
                  {/* Top accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: borderColor }} />
                  {/* Vehicle Image */}
                  {(vehicle.image_url_resolved || vehicle.image_url) ? (
                    <div className="mb-2 mt-1 relative">
                      <FadeInImage
                        src={vehicle.image_url_resolved || vehicle.image_url}
                        alt={vehicle.name}
                        className={`w-full h-32 object-cover rounded-lg border grayscale opacity-40 ${
                          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-200 border-gray-300'
                        }`}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-lg font-bold px-4 py-1 rounded-lg ${
                          darkMode
                            ? 'bg-gray-900/80 text-gray-300 border-2 border-gray-600'
                            : 'bg-white/80 text-gray-700 border-2 border-gray-400'
                        }`} style={{ fontFamily: "'FoundationOne', 'Courier New', monospace" }}>
                          ARCHIVED
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2 mt-1 w-full h-32 rounded-lg flex flex-col items-center justify-center">
                      <Camera className={`w-8 h-8 mb-1 opacity-40 ${
                        darkMode ? 'text-gray-600' : 'text-gray-400'
                      }`} />
                      <p className={`text-xs ${
                        darkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        No image
                      </p>
                    </div>
                  )}

                  {/* Vehicle Header */}
                  <div className="mb-2">
                    <h3 className={`text-base font-bold ${
                      darkMode ? 'text-gray-100' : 'text-slate-800'
                    }`}>
                      {vehicle.nickname || [vehicle.year, vehicle.make, vehicle.name].filter(Boolean).join(' ')}
                    </h3>
                    {vehicle.nickname && [vehicle.year, vehicle.make, vehicle.name].filter(Boolean).length > 0 && (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap mt-1 ${
                        darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-700'
                      }`}>
                        {[vehicle.year, vehicle.make, vehicle.name].filter(Boolean).join(' ')}
                      </span>
                    )}
                  </div>
                </div>
              );
              })}
              </div>
              </>
            ) : (
              <div className={`text-center py-8 rounded-lg border ${
                darkMode ? 'bg-gray-700/30 border-gray-600 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}>
                <Car className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Archive empty</p>
              </div>
            )}
          </div>
        </>

        {/* Add Vehicle Modal */}
        <AddVehicleModal
          isOpen={showAddVehicleModal}
          darkMode={darkMode}
          newVehicle={newVehicle}
          setNewVehicle={setNewVehicle}
          vehicleImagePreview={vehicleImagePreview}
          vehicleImageFile={vehicleImageFile}
          uploadingImage={uploadingImage}
          isDraggingImage={isDraggingImage}
          isModalClosing={isModalClosing}
          handleCloseModal={handleCloseModal}
          addVehicle={addVehicle}
          uploadVehicleImage={uploadVehicleImage}
          clearImageSelection={clearImageSelection}
          handleImageFileChange={handleImageFileChange}
          handleImageDragEnter={handleImageDragEnter}
          handleImageDragLeave={handleImageDragLeave}
          handleImageDragOver={handleImageDragOver}
          handleImageDrop={handleImageDrop}
          vehicleImageFiles={vehicleImageFiles}
          setVehicleImageFiles={setVehicleImageFiles}
          MAX_VEHICLE_IMAGES={MAX_VEHICLE_IMAGES}
          addImageFile={addImageFile}
          removeImageFile={removeImageFile}
          setPrimaryImageFile={setPrimaryImageFile}
          uploadMultipleVehicleImages={uploadMultipleVehicleImages}
          onClose={() => {
            setShowAddVehicleModal(false);
            // Reset form to initial state
            setNewVehicle({
              nickname: '',
              name: '',
              make: '',
              year: '',
              license_plate: '',
              vin: '',
              odometer_range: '',
              odometer_unit: 'km',
              purchase_price: '',
              purchase_date: '',
              fuel_filter: '',
              air_filter: '',
              oil_filter: '',
              oil_type: '',
              oil_capacity: '',
              oil_brand: '',
              drain_plug: '',
              battery: '',
              image_url: '',
              images: [],
              color: '#3B82F6'
            });
          }}
          setConfirmDialog={setConfirmDialog}
        />


        {/* Vehicle Detail Modal */}
        <VehicleDetailModal
          isOpen={showVehicleDetailModal}
          setShowVehicleDetailModal={setShowVehicleDetailModal}
          darkMode={darkMode}
          viewingVehicle={viewingVehicle}
          setViewingVehicle={setViewingVehicle}
          vehicleModalProjectView={vehicleModalProjectView}
          setVehicleModalProjectView={setVehicleModalProjectView}
          vehicleModalEditMode={vehicleModalEditMode}
          setVehicleModalEditMode={setVehicleModalEditMode}
          originalVehicleData={originalVehicleData}
          setOriginalVehicleData={setOriginalVehicleData}
          isModalClosing={isModalClosing}
          projects={projects}
          parts={parts}
          vehicles={vehicles}
          vendorColors={vendorColors}
          vehicleImagePreview={vehicleImagePreview}
          vehicleImageFile={vehicleImageFile}
          uploadingImage={uploadingImage}
          isDraggingImage={isDraggingImage}
          editingTodoId={editingTodoId}
          setEditingTodoId={setEditingTodoId}
          editingTodoText={editingTodoText}
          setEditingTodoText={setEditingTodoText}
          newTodoText={newTodoText}
          setNewTodoText={setNewTodoText}
          handleCloseModal={handleCloseModal}
          hasUnsavedVehicleChanges={hasUnsavedVehicleChanges}
          updateVehicle={updateVehicle}
          deleteVehicle={deleteVehicle}
          updateProject={updateProject}
          uploadVehicleImage={uploadVehicleImage}
          clearImageSelection={clearImageSelection}
          handleImageFileChange={handleImageFileChange}
          handleImageDragEnter={handleImageDragEnter}
          handleImageDragLeave={handleImageDragLeave}
          handleImageDragOver={handleImageDragOver}
          handleImageDrop={handleImageDrop}
          vehicleImageFiles={vehicleImageFiles}
          setVehicleImageFiles={setVehicleImageFiles}
          MAX_VEHICLE_IMAGES={MAX_VEHICLE_IMAGES}
          addImageFile={addImageFile}
          removeImageFile={removeImageFile}
          setPrimaryImageFile={setPrimaryImageFile}
          uploadMultipleVehicleImages={uploadMultipleVehicleImages}
          deleteVehicleImageFromStorage={deleteVehicleImageFromStorage}
          getPrimaryImageUrl={getPrimaryImageUrl}
          getVehicleProjects={getVehicleProjects}
          unlinkPartFromProject={unlinkPartFromProject}
          loadProjects={loadProjects}
          loadParts={loadParts}
          deleteProject={deleteProject}
          deletePart={deletePart}
          setConfirmDialog={setConfirmDialog}
          getStatusColors={getStatusColors}
          getPriorityColors={getPriorityColors}
          getStatusText={getStatusText}
          getStatusTextColor={getStatusTextColor}
          getVendorColor={getVendorColor}
          calculateProjectTotal={calculateProjectTotal}
          calculateProjectStatus={calculateProjectStatus}
          toast={toast}
          setActiveTab={setActiveTab}
          archivePart={archivePart}
          onAddPartFromProject={onAddPartFromProject}
          setShowPartDetailModal={setShowPartDetailModal}
          setViewingPart={setViewingPart}
        />
      </>
    </div>
  );
};

export default VehiclesTab;
