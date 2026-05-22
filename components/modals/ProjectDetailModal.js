import React, { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { X, Trash2, Archive, ArchiveRestore, Pause, Play, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import ProjectDetailView from '../ui/ProjectDetailView';
import ProjectEditForm from '../ui/ProjectEditForm';
import LinkedPartsSection from '../ui/LinkedPartsSection';
import PrimaryButton from '../ui/PrimaryButton';
import ProjectViewActions from '../ui/ProjectViewActions';
import ProjectNotesModal from './ProjectNotesModal';
import * as partsService from '../../services/partsService';

const ProjectDetailModal = ({
  isOpen,
  darkMode,
  viewingProject,
  setViewingProject,
  projectModalEditMode,
  setProjectModalEditMode,
  originalProjectData,
  setOriginalProjectData,
  isModalClosing,
  projects,
  parts,
  vehicles,
  vendorColors,
  editingTodoId,
  setEditingTodoId,
  editingTodoText,
  setEditingTodoText,
  newTodoText,
  setNewTodoText,
  handleCloseModal,
  hasUnsavedProjectChanges,
  updateProject,
  deleteProject,
  unlinkPartFromProject,
  loadProjects,
  getStatusColors,
  getPriorityColors,
  getStatusText,
  getStatusTextColor,
  getVendorColor,
  calculateProjectTotal,
  calculateProjectStatus,
  setConfirmDialog,
  setActiveTab,
  archivePart,
  onAddPart,
  setShowPartDetailModal,
  setViewingPart,
  onClose
}) => {
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Touch refs for swipe gestures
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const isScrollingRef = useRef(false);
  const minSwipeDistance = 50;

  // Track if this modal was open (for close animation)
  const wasOpen = useRef(false);
  if (isOpen) wasOpen.current = true;

  // Filter to non-archived projects for navigation
  const navigableProjects = useMemo(() =>
    projects.filter(p => !p.archived),
    [projects]
  );

  // Get current index and navigation state
  const currentIndex = navigableProjects.findIndex(p => p.id === viewingProject?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < navigableProjects.length - 1 && currentIndex !== -1;

  const goToPrevProject = useCallback(() => {
    if (hasPrev) {
      setViewingProject(navigableProjects[currentIndex - 1]);
    }
  }, [hasPrev, navigableProjects, currentIndex, setViewingProject]);

  const goToNextProject = useCallback(() => {
    if (hasNext) {
      setViewingProject(navigableProjects[currentIndex + 1]);
    }
  }, [hasNext, navigableProjects, currentIndex, setViewingProject]);

  // Keyboard navigation (left/right arrow keys)
  useEffect(() => {
    if (!isOpen || projectModalEditMode) return;

    const handleKeyDown = (e) => {
      // Don't navigate if user is typing in an input or contentEditable element
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        goToPrevProject();
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        goToNextProject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, projectModalEditMode, hasPrev, hasNext, goToPrevProject, goToNextProject]);

  // Touch handlers for swipe gestures (same pattern as PartDetailModal)
  const handleTouchStart = (e) => {
    touchEndRef.current = null;
    isScrollingRef.current = false;
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;

    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;

    const diffX = Math.abs(currentX - touchStartRef.current.x);
    const diffY = Math.abs(currentY - touchStartRef.current.y);

    // Detect if user is scrolling vertically
    if (diffY > diffX && diffY > 10) {
      isScrollingRef.current = true;
    }

    touchEndRef.current = { x: currentX, y: currentY };
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    if (projectModalEditMode) return;

    // Don't trigger navigation if user was scrolling vertically
    if (isScrollingRef.current) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      isScrollingRef.current = false;
      return;
    }

    const distance = touchStartRef.current.x - touchEndRef.current.x;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && hasNext) {
      goToNextProject();
    } else if (isRightSwipe && hasPrev) {
      goToPrevProject();
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
    isScrollingRef.current = false;
  };

  // Keep modal mounted during closing animation only if THIS modal was open
  // Reset wasOpen when modal finishes closing
  if (!isOpen && !isModalClosing) {
    wasOpen.current = false;
  }
  if ((!isOpen && !(isModalClosing && wasOpen.current)) || !viewingProject) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal-backdrop ${
        isModalClosing ? 'modal-backdrop-exit' : 'modal-backdrop-enter'
      }`}
      onClick={() => handleCloseModal(() => {
        // Check for unsaved changes
        if (hasUnsavedProjectChanges()) {
          setConfirmDialog({
            isOpen: true,
            title: 'Unsaved Changes',
            message: 'You have unsaved changes. Are you sure you want to close without saving?',
            confirmText: 'Discard',
            cancelText: 'Go Back',
            onConfirm: () => {
              setProjectModalEditMode(false);
              setOriginalProjectData(null);
              onClose();
            }
          });
          return;
        }
        setProjectModalEditMode(false);
        setOriginalProjectData(null);
        onClose();
      })}
    >
      <div
        className={`rounded-lg shadow-xl max-w-5xl w-full overflow-hidden modal-content grid ${
          isModalClosing ? 'modal-popup-exit' : 'modal-popup-enter'
        } ${darkMode ? 'bg-gray-800' : 'bg-slate-200'}`}
        style={{
          gridTemplateRows: 'auto 1fr auto',
          maxHeight: projectModalEditMode ? '90vh' : '85vh',
          transition: 'max-height 0.7s ease-in-out'
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 px-6 py-4 border-b ${
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-300'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <h2 className={`text-2xl font-bold ${
              darkMode ? 'text-gray-100' : 'text-gray-800'
            }`} style={{ fontFamily: "'FoundationOne', 'Courier New', monospace" }}>
              {viewingProject.name}
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleCloseModal(() => {
                  // Check for unsaved changes
                  if (hasUnsavedProjectChanges()) {
                    setConfirmDialog({
                      isOpen: true,
                      title: 'Unsaved Changes',
                      message: 'You have unsaved changes. Are you sure you want to close without saving?',
                      confirmText: 'Discard',
                      cancelText: 'Go Back',
                      onConfirm: () => {
                        setProjectModalEditMode(false);
                        setOriginalProjectData(null);
                        onClose();
                      }
                    });
                    return;
                  }
                  setProjectModalEditMode(false);
                  setOriginalProjectData(null);
                  onClose();
                })}
                className={`transition-colors flex-shrink-0 ${
                  darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content - with slide animation */}
        <div className="relative min-h-0 sm:min-h-[calc(90vh-180px)] overflow-hidden sm:overflow-visible modal-content-wrapper">
          {/* Project Details View */}
          <div
            className={`w-full transition-all duration-500 ease-in-out ${
              projectModalEditMode
                ? 'absolute opacity-0 pointer-events-none'
                : 'relative opacity-100'
            }`}
          >
            <div
              key={viewingProject.id}
              className="p-6 pb-12 space-y-6 max-h-[calc(85vh-120px)] overflow-y-auto sm:max-h-[calc(90vh-180px)] animate-fade-in"
            >
              <ProjectDetailView
                project={viewingProject}
                parts={parts}
                vehicles={vehicles}
                darkMode={darkMode}
                updateProject={(projectId, updates) => {
                  // Auto-calculate status based on todos only when status is not explicitly set
                  let finalUpdates = { ...updates };
                  if (updates.todos && updates.status === undefined) {
                    const linkedParts = parts.filter(p => p.projectId === viewingProject?.id);
                    finalUpdates.status = calculateProjectStatus(updates.todos, viewingProject?.status, linkedParts);
                  }
                  // Optimistic update: update viewingProject immediately for snappy UI
                  setViewingProject(prev => ({ ...prev, ...finalUpdates }));
                  // Persist to database in background (hook handles optimistic update on projects array)
                  updateProject(projectId, updates);
                }}
                getStatusColors={getStatusColors}
                getPriorityColors={getPriorityColors}
                getStatusText={getStatusText}
                getStatusTextColor={getStatusTextColor}
                getVendorColor={getVendorColor}
                vendorColors={vendorColors}
                calculateProjectTotal={calculateProjectTotal}
                editingTodoId={editingTodoId}
                setEditingTodoId={setEditingTodoId}
                editingTodoText={editingTodoText}
                setEditingTodoText={setEditingTodoText}
                newTodoText={newTodoText}
                setNewTodoText={setNewTodoText}
                onNavigateToTab={(tab) => {
                  handleCloseModal(() => {
                    onClose();
                  });
                  setActiveTab(tab);
                }}
                onViewPart={(part) => {
                  setViewingPart(part);
                  setShowPartDetailModal(true);
                }}
              />
            </div>
          </div>

          {/* Edit Project View - Slides in for editing */}
          <div
            className={`w-full transition-all duration-500 ease-in-out ${
              projectModalEditMode
                ? 'relative opacity-100'
                : 'absolute opacity-0 pointer-events-none'
            }`}
          >
            <div className="p-6 pb-12 space-y-6 max-h-[calc(85vh-120px)] overflow-y-auto sm:max-h-[calc(90vh-180px)]">
              <ProjectEditForm
                project={viewingProject}
                onProjectChange={setViewingProject}
                vehicles={vehicles}
                parts={parts}
                unlinkPartFromProject={unlinkPartFromProject}
                getVendorColor={getVendorColor}
                vendorColors={vendorColors}
                darkMode={darkMode}
              />

              <LinkedPartsSection
                projectId={viewingProject.id}
                parts={parts}
                unlinkPartFromProject={unlinkPartFromProject}
                getVendorColor={getVendorColor}
                vendorColors={vendorColors}
                darkMode={darkMode}
                setConfirmDialog={setConfirmDialog}
                onNavigateToTab={(tab) => {
                  handleCloseModal(() => {
                    onClose();
                  });
                  setActiveTab(tab);
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer with conditional buttons */}
        <div className={`sticky bottom-0 border-t p-4 flex items-center justify-between ${
          darkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-300 bg-slate-100'
        }`}>
          {projectModalEditMode ? (
            <div className="flex items-center justify-between sm:justify-start w-full gap-2">
              <button
                onClick={() => {
                  // Check for unsaved changes before going back
                  if (hasUnsavedProjectChanges()) {
                    setConfirmDialog({
                      isOpen: true,
                      title: 'Unsaved Changes',
                      message: 'You have unsaved changes. Are you sure you want to go back without saving?',
                      confirmText: 'Discard',
                      cancelText: 'Keep Editing',
                      onConfirm: () => {
                        // Restore original data
                        if (originalProjectData) {
                          setViewingProject({ ...originalProjectData });
                        }
                        setProjectModalEditMode(false);
                      }
                    });
                    return;
                  }
                  setProjectModalEditMode(false);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-100 border-gray-600 hover:border-gray-500'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border-gray-300 hover:border-gray-400'
                }`}
                title="Back"
              >
                <ChevronDown className="w-5 h-5 rotate-90" />
              </button>
              <div className="flex items-center gap-1 sm:gap-2 sm:ml-auto sm:mr-2">
                <button
                  onClick={async () => {
                    const partsForProject = parts.filter(p => p.projectId === viewingProject.id);
                    const hasParts = partsForProject.length > 0;
                    setConfirmDialog({
                      isOpen: true,
                      title: 'Delete Project',
                      message: hasParts
                        ? `This project has ${partsForProject.length} part(s) linked to it. Deleting it will unlink these parts. This action cannot be undone.`
                        : 'Are you sure you want to permanently delete this project? This action cannot be undone.',
                      confirmText: 'Delete',
                      onConfirm: async () => {
                        await deleteProject(viewingProject.id);
                        setProjectModalEditMode(false);
                        setOriginalProjectData(null);
                        onClose();
                      }
                    });
                  }}
                  className={`h-10 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm ${
                    darkMode
                      ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-700'
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-300'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
                <button
                  onClick={async () => {
                    const linkedPartsToArchive = parts.filter(p => p.projectId === viewingProject.id && !p.archived);
                    const linkedPartsToRestore = parts.filter(p => p.projectId === viewingProject.id && p.archived);
                    const archiveCount = linkedPartsToArchive.length;
                    const restoreCount = linkedPartsToRestore.length;

                    let archiveMessage = archiveCount > 0
                      ? `Are you sure you want to archive this project? It will remain visible with limited information, and ${archiveCount} linked part${archiveCount > 1 ? 's' : ''} will also be archived.`
                      : 'Are you sure you want to archive this project? It will still be visible but with limited information.';

                    let unarchiveMessage = restoreCount > 0
                      ? `Are you sure you want to unarchive this project? It has ${restoreCount} archived part${restoreCount > 1 ? 's' : ''} that can be restored.`
                      : 'Are you sure you want to unarchive this project?';

                    setConfirmDialog({
                      isOpen: true,
                      title: viewingProject.archived ? 'Unarchive Project' : 'Archive Project',
                      message: viewingProject.archived ? unarchiveMessage : archiveMessage,
                      confirmText: viewingProject.archived ? 'Unarchive' : 'Archive',
                      isDangerous: false,
                      // Show Restore button when unarchiving and there are archived parts
                      ...(viewingProject.archived && restoreCount > 0 ? {
                        secondaryText: 'Restore All',
                        secondaryDangerous: false,
                        secondaryAction: async () => {
                          // Unarchive project and all linked parts using service directly
                          const updatedProject = {
                            ...viewingProject,
                            archived: false
                          };
                          await updateProject(viewingProject.id, { archived: false });
                          // Restore all archived linked parts in parallel using service directly
                          await Promise.all(linkedPartsToRestore.map(part =>
                            partsService.updatePart(part.id, { archived: false })
                          ));
                          setViewingProject(updatedProject);
                          setOriginalProjectData({ ...updatedProject });
                        }
                      } : {}),
                      onConfirm: async () => {
                        const updatedProject = {
                          ...viewingProject,
                          archived: !viewingProject.archived
                        };
                        await updateProject(viewingProject.id, { archived: !viewingProject.archived });
                        // When archiving, also archive all linked parts in parallel using service directly
                        if (!viewingProject.archived) {
                          await Promise.all(linkedPartsToArchive.map(part =>
                            partsService.updatePart(part.id, { archived: true })
                          ));
                        }
                        setViewingProject(updatedProject);
                        setOriginalProjectData({ ...updatedProject });
                      }
                    });
                  }}
                  className={`h-10 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm ${
                    viewingProject.archived
                      ? darkMode
                        ? 'bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-700'
                        : 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-300'
                      : darkMode
                        ? 'bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 border border-amber-700'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-300'
                  }`}
                >
                  {viewingProject.archived ? <ArchiveRestore className="w-5 h-5 sm:w-4 sm:h-4" /> : <Archive className="w-5 h-5 sm:w-4 sm:h-4" />}
                  <span className="hidden sm:inline">{viewingProject.archived ? 'Unarchive' : 'Archive'}</span>
                </button>
                <button
                  onClick={async () => {
                    // Toggle on_hold status
                    let newStatus;
                    if (viewingProject.status === 'on_hold') {
                      const linkedParts = parts.filter(p => p.projectId === viewingProject?.id);
                      newStatus = calculateProjectStatus(viewingProject.todos, null, linkedParts);
                    } else {
                      newStatus = 'on_hold';
                    }
                    const updatedProject = { ...viewingProject, status: newStatus };
                    await updateProject(viewingProject.id, {
                      status: newStatus
                    });
                    setViewingProject(updatedProject);
                  }}
                  className={`h-10 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm ${
                    viewingProject.status === 'on_hold'
                      ? darkMode
                        ? 'bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-700'
                        : 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-300'
                      : darkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-100 border border-gray-600'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'
                  }`}
                >
                  {viewingProject.status === 'on_hold' ? (
                    <>
                      <Play className="w-5 h-5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Resume</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-5 h-5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Pause</span>
                    </>
                  )}
                </button>
              </div>
              <PrimaryButton
                onClick={async () => {
                  await updateProject(viewingProject.id, {
                    name: viewingProject.name,
                    description: viewingProject.description,
                    budget: parseFloat(viewingProject.budget),
                    priority: viewingProject.priority,
                    status: viewingProject.status,
                    vehicle_id: viewingProject.vehicle_id || null,
                    todos: viewingProject.todos || []
                  });
                  // Update viewing data with saved changes
                  const updatedProject = {
                    ...viewingProject,
                    budget: parseFloat(viewingProject.budget)
                  };
                  setViewingProject(updatedProject);
                  setOriginalProjectData({ ...updatedProject });
                  setProjectModalEditMode(false);
                }}
              >
                <span className="sm:hidden">Save</span>
                <span className="hidden sm:inline">Save Changes</span>
              </PrimaryButton>
            </div>
          ) : (
            <>
              {/* Navigation controls on the left */}
              {navigableProjects.length > 1 && currentIndex !== -1 && (
                <div className="flex items-center pr-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPrevProject();
                    }}
                    disabled={!hasPrev}
                    className={`nav-btn ${darkMode ? 'dark' : 'light'}`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className={`text-xs font-medium min-w-[3rem] text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {currentIndex + 1} / {navigableProjects.length}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goToNextProject();
                    }}
                    disabled={!hasNext}
                    className={`nav-btn ${darkMode ? 'dark' : 'light'}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
              <ProjectViewActions
                project={viewingProject}
                darkMode={darkMode}
                onAddPart={onAddPart}
                onNotesClick={() => setShowNotesModal(true)}
                onEditClick={() => setProjectModalEditMode(true)}
                className="ml-auto"
              />
            </>
          )}
        </div>
      </div>

      <ProjectNotesModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        project={viewingProject}
        onSave={async (notes) => {
          await updateProject(viewingProject.id, { notes });
          setViewingProject({ ...viewingProject, notes });
        }}
        darkMode={darkMode}
        handleCloseModal={handleCloseModal}
        setConfirmDialog={setConfirmDialog}
      />
    </div>
  );
};

export default ProjectDetailModal;
