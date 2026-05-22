import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Package, PackageOpen, BadgeDollarSign, TrendingUp, Truck, CheckCircle, Clock, ChevronDown, Plus, X, ExternalLink, ChevronUp, Edit2, Trash2, Moon, Sun, ListChecks, GripVertical, ShoppingCart, Car, Upload, Gauge, Settings, Check, Archive, ChevronRight, Pause, Play, LogOut, LayoutGrid, LayoutList, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Utilities
import {
  getStatusColors,
  getPriorityColors,
  getPriorityBorderColor,
  getVendorColor,
  getVendorDisplayColor,
  hexToRgba,
  isLightColor,
  darkenColor,
  getMutedColor
} from '../utils/colorUtils';
import {
  cardBg,
  secondaryBg,
  primaryText,
  secondaryText,
  borderColor,
  hoverBg,
  inputClasses,
  selectDropdownStyle
} from '../utils/styleUtils';
import {
  calculateVehicleTotalSpent,
  calculateProjectTotal
} from '../utils/dataUtils';
import {
  getTrackingUrl,
  getCarrierName
} from '../utils/trackingUtils';

// UI Components
import ConfirmDialog from './ui/ConfirmDialog';
import ToastContainer from './ui/ToastContainer';
import PrimaryButton from './ui/PrimaryButton';
import PriceDisplay from './ui/PriceDisplay';
import VendorSelect from './ui/VendorSelect';
import ProjectDetailView from './ui/ProjectDetailView';
import ProjectEditForm from './ui/ProjectEditForm';
import LinkedPartsSection from './ui/LinkedPartsSection';

// Modal Components
import AddPartModal from './modals/AddPartModal';
import AddPartOptionsModal from './modals/AddPartOptionsModal';
import CSVImportModal from './modals/CSVImportModal';
import TrackingModal from './modals/TrackingModal';
import PartDetailModal from './modals/PartDetailModal';
import AddProjectModal from './modals/AddProjectModal';
import ProjectDetailModal from './modals/ProjectDetailModal';
import AddVehicleModal from './modals/AddVehicleModal';
import VehicleDetailModal from './modals/VehicleDetailModal';
import DeleteAccountModal from './modals/DeleteAccountModal';
import ManageVendorsModal from './modals/ManageVendorsModal';
import UpdateLoginEmailModal from './modals/UpdateLoginEmailModal';
import NewUserConfirmModal from './modals/NewUserConfirmModal';

// Tab Components
import PartsTab from './tabs/PartsTab';
import ProjectsTab from './tabs/ProjectsTab';
import VehiclesTab from './tabs/VehiclesTab';

// Custom Hooks
import useDarkMode from '../hooks/useDarkMode';
import useFilters from '../hooks/useFilters';
import useModals from '../hooks/useModals';
import useDragDrop from '../hooks/useDragDrop';
import useParts from '../hooks/useParts';
import useProjects from '../hooks/useProjects';
import useVehicles from '../hooks/useVehicles';
import useHoverCapability from '../hooks/useHoverCapability';
import { useAuthContext } from './AuthProvider';
import { useDemoContext } from './DemoProvider';

// Context Providers
import { AppProviders } from '../contexts';


// ========================================
// MAIN SHAKO COMPONENT
// ========================================

const Shako = ({ isDemo = false }) => {
  // ========================================
  // CUSTOM HOOKS
  // ========================================

  // Dark mode hook
  const { darkMode, setDarkMode, darkModeInitialized, mounted } = useDarkMode();

  // Hover capability detection (adds 'has-hover' class to document when mouse/trackpad is used)
  useHoverCapability();

  // Auth hook
  const {
    user,
    loading: authLoading,
    signOut,
    deleteAccount,
    initiateEmailMigration,
    migrationResult,
    clearMigrationResult,
    pendingNewUser,
    confirmNewUser,
    cancelNewUser
  } = useAuthContext();

  // Demo context
  const { demoUser, exitDemoMode, resetDemo } = useDemoContext();

  // Use demo user if in demo mode, otherwise use real user
  const activeUser = isDemo ? demoUser : user;
  const userId = activeUser?.id;

  // Toast notification state (created here so hooks can use it)
  const [toasts, setToasts] = useState([]);

  const showToast = React.useCallback((message, options = {}) => {
    const { type = 'info', duration = 5000 } = options;
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const toast = React.useMemo(() => ({
    success: (message, options = {}) => showToast(message, { ...options, type: 'success' }),
    error: (message, options = {}) => showToast(message, { ...options, type: 'error', duration: options.duration || 7000 }),
    warning: (message, options = {}) => showToast(message, { ...options, type: 'warning' }),
    info: (message, options = {}) => showToast(message, { ...options, type: 'info' }),
  }), [showToast]);

  const dismissToast = React.useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Delete account modal state
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  // Update login email modal state
  const [showUpdateEmailModal, setShowUpdateEmailModal] = useState(false);

  // Parts hook
  const {
    parts,
    setParts,
    vendors,
    vendorColors,
    loading: loadingParts,
    newPart,
    setNewPart,
    loadParts,
    loadVendors,
    updateVendorColor,
    addNewPart,
    createPartDirectly,
    updatePartStatus,
    saveTrackingInfo,
    skipTrackingInfo,
    saveEditedPart,
    deletePart,
    archivePart,
    renameVendor,
    deleteVendor,
    unlinkPartFromProject,
    updatePartProject,
    updatePartTrackingData,
    updateCourierOverride,
    getUniqueVendors,
    importPartsFromCSV
  } = useParts(userId, toast, isDemo);

  // Projects hook
  const {
    projects,
    setProjects,
    loading: loadingProjects,
    newProject,
    setNewProject,
    loadProjects,
    addProject,
    updateProject,
    deleteProject,
    updateProjectsOrder,
    calculateProjectStatus,
    getVehicleProjects,
    getVehicleProjectCount
  } = useProjects(userId, toast, isDemo);

  // Vehicles hook
  const {
    vehicles,
    setVehicles,
    loading: loadingVehicles,
    imagesLoaded,
    newVehicle,
    setNewVehicle,
    vehicleImageFile,
    setVehicleImageFile,
    vehicleImagePreview,
    setVehicleImagePreview,
    uploadingImage,
    setUploadingImage,
    isDraggingImage,
    setIsDraggingImage,
    // Multi-image state
    vehicleImageFiles,
    setVehicleImageFiles,
    MAX_VEHICLE_IMAGES,
    loadVehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    updateVehiclesOrder,
    uploadVehicleImage,
    getPrimaryImageUrl,
    handleImageFileChange,
    clearImageSelection,
    handleImageDragEnter,
    handleImageDragLeave,
    handleImageDragOver,
    handleImageDrop,
    // Multi-image handlers
    addImageFile,
    removeImageFile,
    setPrimaryImageFile,
    uploadMultipleVehicleImages,
    deleteVehicleImageFromStorage
  } = useVehicles(userId, toast, isDemo);

  // Note: Document and service event state is now managed via context (DocumentContext, ServiceEventContext)
  // and consumed directly by VehicleDetailModal

  // Filters hook
  const {
    searchTerm,
    setSearchTerm,
    deliveredFilter,
    setDeliveredFilter,
    statusFilter,
    setStatusFilter,
    vendorFilter,
    setVendorFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    isSorting,
    setIsSorting,
    isStatusFiltering,
    setIsStatusFiltering,
    isSearching,
    setIsSearching,
    partsDateFilter,
    setPartsDateFilter,
    isFilteringParts,
    setIsFilteringParts,
    showDateFilterDropdown,
    setShowDateFilterDropdown,
    showArchivedParts,
    setShowArchivedParts,
    projectVehicleFilter,
    setProjectVehicleFilter,
    isFilteringProjects,
    setIsFilteringProjects,
    showVehicleFilterDropdown,
    setShowVehicleFilterDropdown,
    vehicleFilterDropdownClosing,
    closeVehicleFilterDropdown,
    dateFilterDropdownClosing,
    closeDateFilterDropdown,
    isArchiveCollapsed,
    setIsArchiveCollapsed,
    isProjectArchiveCollapsed,
    setIsProjectArchiveCollapsed,
    archiveStatesInitialized,
    openDropdown,
    setOpenDropdown
  } = useFilters();

  // Modals hook
  const {
    showAddPartOptionsModal,
    setShowAddPartOptionsModal,
    showAddModal,
    setShowAddModal,
    showCSVImportModal,
    setShowCSVImportModal,
    csvFile,
    setCsvFile,
    showTrackingModal,
    setShowTrackingModal,
    showPartDetailModal,
    setShowPartDetailModal,
    viewingPart,
    setViewingPart,
    partDetailView,
    setPartDetailView,
    trackingModalPartId,
    setTrackingModalPartId,
    trackingInput,
    setTrackingInput,
    editingPart,
    setEditingPart,
    originalPartData,
    setOriginalPartData,
    partModalView,
    setPartModalView,
    editingVendor,
    setEditingVendor,
    showAddProjectModal,
    setShowAddProjectModal,
    showProjectDetailModal,
    setShowProjectDetailModal,
    viewingProject,
    setViewingProject,
    originalProjectData,
    setOriginalProjectData,
    projectModalEditMode,
    setProjectModalEditMode,
    editingTodoId,
    setEditingTodoId,
    editingTodoText,
    setEditingTodoText,
    newTodoText,
    setNewTodoText,
    showAddProjectVehicleDropdown,
    setShowAddProjectVehicleDropdown,
    showAddVehicleModal,
    setShowAddVehicleModal,
    showVehicleDetailModal,
    setShowVehicleDetailModal,
    viewingVehicle,
    setViewingVehicle,
    originalVehicleData,
    setOriginalVehicleData,
    vehicleModalProjectView,
    setVehicleModalProjectView,
    vehicleModalEditMode,
    setVehicleModalEditMode,
    showManageVendorsModal,
    setShowManageVendorsModal,
    isModalClosing,
    setIsModalClosing,
    handleCloseModal,
    closeAllModals,
    isTransitioningModals,
    savedScrollPosition,
    confirmDialog,
    setConfirmDialog
  } = useModals();

  // Drag and drop hook
  const {
    draggedProject,
    setDraggedProject,
    dragOverProject,
    setDragOverProject,
    dragOverProjectArchiveZone,
    setDragOverProjectArchiveZone,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleProjectArchiveZoneDrop,
    draggedVehicle,
    setDraggedVehicle,
    dragOverVehicle,
    setDragOverVehicle,
    dragOverArchiveZone,
    setDragOverArchiveZone,
    handleVehicleDragStart,
    handleVehicleDragOver,
    handleVehicleDragLeave,
    handleVehicleDrop,
    handleVehicleDragEnd,
    handleArchiveZoneDrop
  } = useDragDrop({
    parts,
    projects,
    setProjects,
    updateProjectsOrder,
    updateProject,
    loadProjects,
    vehicles,
    setVehicles,
    updateVehiclesOrder,
    updateVehicle,
    loadVehicles,
    setConfirmDialog
  });

  // ========================================
  // COMBINED LOADING STATE
  // ========================================

  // Show loading screen until all data and vehicle images are loaded to prevent flash of empty content
  const loading = loadingParts || loadingProjects || loadingVehicles || !imagesLoaded;

  // ========================================
  // LOCAL COMPONENT STATE
  // ========================================

  const [activeTab, setActiveTab] = useState('vehicles'); // 'parts', 'projects', or 'vehicles'
  const [previousTab, setPreviousTab] = useState('vehicles');

  // Vehicle layout mode state with localStorage persistence (default to compact)
  const [vehicleLayoutMode, setVehicleLayoutMode] = useState('compact');

  // Load vehicle layout preference from localStorage on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('vehicleLayoutMode');
    if (savedLayout === 'compact' || savedLayout === 'default') {
      setVehicleLayoutMode(savedLayout);
    }
  }, []);

  // Refs for tab underline animation
  const tabRefs = useRef({});
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const [hoverTab, setHoverTab] = useState(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  const [menuHasBeenToggled, setMenuHasBeenToggled] = useState(false);
  const userMenuRef = useRef(null);

  // Function to close menu with animation
  const closeMenuWithAnimation = () => {
    if (showUserMenu && !isMenuClosing) {
      setIsMenuClosing(true);
      setTimeout(() => {
        setShowUserMenu(false);
        setIsMenuClosing(false);
      }, 150); // Match dropdown-fade-out duration
    }
  };

  // Refs for swipe detection on tab content
  const tabContentRef = useRef(null);
  const swipeContainerRef = useRef(null); // Main container ref for swipe gestures to work on entire page
  const modalOpenRef = useRef(false);

  // Keep modalOpenRef in sync with modal states
  useEffect(() => {
    modalOpenRef.current = showPartDetailModal || showProjectDetailModal || showVehicleDetailModal;
  }, [showPartDetailModal, showProjectDetailModal, showVehicleDetailModal]);

  // Detect touch device on mount
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Detect PWA standalone mode and add class to html element
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true;
    if (isStandalone) {
      document.documentElement.classList.add('pwa-standalone');
    }
    return () => {
      document.documentElement.classList.remove('pwa-standalone');
    };
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        closeMenuWithAnimation();
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu, isMenuClosing]);

  // Refs for archive sections to enable auto-scroll
  const projectArchiveRef = useRef(null);
  const vehicleArchiveRef = useRef(null);

  // ========================================
  // WRAPPER FUNCTIONS FOR HOOKS
  // ========================================

  // Wrapper functions that provide state setters to hook functions

  // Context for returning to a project/vehicle-project view after adding a part
  // Shape: { type: 'project', project } | { type: 'vehicleProject', vehicle, project }
  const [addPartReturnContext, setAddPartReturnContext] = React.useState(null);

  const returnToAddPartContext = (ctx) => {
    if (!ctx) return;
    if (ctx.type === 'project') {
      setViewingProject(ctx.project);
      setOriginalProjectData({ ...ctx.project });
      setProjectModalEditMode(false);
      setShowProjectDetailModal(true);
    } else if (ctx.type === 'vehicleProject') {
      setViewingVehicle(ctx.vehicle);
      setOriginalVehicleData({ ...ctx.vehicle });
      setVehicleModalProjectView(ctx.project);
      setVehicleModalEditMode(null);
      setShowVehicleDetailModal(true);
    }
  };

  const handleAddNewPart = () => {
    const ctx = addPartReturnContext;
    addNewPart(setShowAddModal, ctx ? () => {
      setAddPartReturnContext(null);
      returnToAddPartContext(ctx);
    } : undefined);
  };

  const handleAddPartFromProject = (project) => {
    handleCloseModal(() => {
      setShowProjectDetailModal(false);
      setViewingProject(null);
      setAddPartReturnContext({ type: 'project', project });
      setNewPart({
        part: '',
        partNumber: '',
        vendor: '',
        price: '',
        shipping: '',
        duties: '',
        quantity: 1,
        tracking: '',
        status: 'pending',
        projectId: project.id,
        vehicleId: project.vehicle_id || null
      });
      setShowAddModal(true);
    });
  };

  const handleAddPartFromVehicleProject = (project) => {
    handleCloseModal(() => {
      setShowVehicleDetailModal(false);
      setViewingVehicle(null);
      setVehicleModalProjectView(null);
      setVehicleModalEditMode(null);
      setAddPartReturnContext({ type: 'vehicleProject', vehicle: viewingVehicle, project });
      setNewPart({
        part: '',
        partNumber: '',
        vendor: '',
        price: '',
        shipping: '',
        duties: '',
        quantity: 1,
        tracking: '',
        status: 'pending',
        projectId: project.id,
        vehicleId: project.vehicle_id || null
      });
      setShowAddModal(true);
    });
  };

  const handleSaveTrackingInfo = () => saveTrackingInfo(
    trackingModalPartId,
    trackingInput,
    setShowTrackingModal,
    setTrackingModalPartId,
    setTrackingInput
  );

  const handleSkipTrackingInfo = () => skipTrackingInfo(
    trackingModalPartId,
    setShowTrackingModal,
    setTrackingModalPartId,
    setTrackingInput
  );

  const handleSaveEditedPart = () => {
    return saveEditedPart(
      editingPart,
      setEditingPart,
      setPartModalView
    );
  };

  const handleRenameVendor = (oldName, newName) => renameVendor(
    oldName,
    newName,
    editingPart,
    setEditingPart,
    setEditingVendor
  );

  const handleDeleteVendor = (vendorName) => deleteVendor(
    vendorName,
    editingPart,
    setEditingPart
  );

  const handleUpdatePartStatus = (partId, newStatus) => updatePartStatus(
    partId,
    newStatus,
    setTrackingModalPartId,
    setShowTrackingModal,
    setOpenDropdown
  );

  // Status change handler for part detail modal (doesn't show tracking modal)
  const handlePartDetailStatusChange = (partId, newStatus) => updatePartStatus(
    partId,
    newStatus,
    null, // Skip tracking modal - user can add tracking via edit
    null,
    null
  );

  // Check if there are unsaved changes in vehicle edit mode
  const hasUnsavedVehicleChanges = () => {
    if (!vehicleModalEditMode || vehicleModalEditMode !== 'vehicle' || !originalVehicleData || !viewingVehicle) {
      return false;
    }
    // Check if any field has changed
    const fieldsToCheck = [
      'nickname', 'name', 'year', 'license_plate', 'vin', 'odometer_range', 'odometer_unit',
      'fuel_filter', 'air_filter', 'oil_filter', 'oil_type', 'oil_capacity',
      'oil_brand', 'drain_plug', 'battery', 'color'
    ];
    for (const field of fieldsToCheck) {
      if (viewingVehicle[field] !== originalVehicleData[field]) {
        return true;
      }
    }
    // Check if a new image has been selected
    if (vehicleImageFile !== null) {
      return true;
    }
    return false;
  };

  const hasUnsavedProjectChanges = () => {
    if (!projectModalEditMode || !originalProjectData || !viewingProject) {
      return false;
    }
    // Check if any field has changed
    const fieldsToCheck = [
      'name', 'description', 'budget', 'priority',
      'vehicle_id'
    ];
    for (const field of fieldsToCheck) {
      if (viewingProject[field] !== originalProjectData[field]) {
        return true;
      }
    }
    return false;
  };

  // Check if there are unsaved changes in part edit mode
  const hasUnsavedPartChanges = () => {
    if (partDetailView !== 'edit' || !originalPartData || !editingPart) {
      return false;
    }
    // Check if any field has changed
    const fieldsToCheck = [
      'part', 'partNumber', 'vendor', 'tracking',
      'price', 'shipping', 'duties', 'projectId'
    ];
    for (const field of fieldsToCheck) {
      // Use loose equality for projectId since it can be null or undefined
      if (field === 'projectId') {
        if ((editingPart[field] || null) !== (originalPartData[field] || null)) {
          return true;
        }
      } else {
        // Convert to string for comparison to handle numeric fields
        const editValue = editingPart[field]?.toString() || '';
        const origValue = originalPartData[field]?.toString() || '';
        if (editValue !== origValue) {
          return true;
        }
      }
    }
    return false;
  };

  // Tab change handler to track animation direction
  const handleTabChange = (newTab) => {
    // If tapping the current tab, close modals and scroll to top
    if (newTab === activeTab) {
      closeAllModals();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    closeAllModals(); // Close any open modals when switching tabs
    setPreviousTab(activeTab);
    setActiveTab(newTab);
  };

  // ========================================
  // EFFECTS
  // ========================================

  // Track previous userId to detect user changes
  const prevUserIdRef = useRef(null);
  const vehiclesLoadedRef = useRef(false);
  const vehiclesLoadedAtRef = useRef(null);

  // Refresh vehicle images when tab becomes visible after being away
  // Supabase signed URLs expire after 1 hour, so refresh if >45 minutes have passed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && vehiclesLoadedRef.current && vehiclesLoadedAtRef.current) {
        const minutesSinceLoad = (Date.now() - vehiclesLoadedAtRef.current) / 1000 / 60;
        if (minutesSinceLoad > 45) {
          vehiclesLoadedAtRef.current = Date.now();
          loadVehicles();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadVehicles]);

  // Load parts, projects, and vendors from Supabase when user is authenticated
  // Also reset state when user changes (logout + login as different user)
  useEffect(() => {
    if (userId) {
      const userChanged = prevUserIdRef.current !== null && prevUserIdRef.current !== userId;

      // If user changed, clear all cached data before loading new user's data
      if (userChanged) {
        setParts([]);
        setProjects([]);
        setVehicles([]);
        vehiclesLoadedRef.current = false;
      }

      loadParts();
      loadProjects();
      loadVendors();

      // Also load vehicles if user changed (to clear stale data)
      if (userChanged && activeTab === 'vehicles') {
        vehiclesLoadedAtRef.current = Date.now();
        loadVehicles();
      }
    }

    prevUserIdRef.current = userId;
    // Don't load vehicles on initial mount, only when tab is accessed
  }, [userId]);

  // Auto-update project status to sourcing/ready/planning based on linked parts delivery state.
  // Only affects projects that haven't started work (not in_progress, completed, or on_hold).
  useEffect(() => {
    if (!projects.length) return;
    projects.forEach(project => {
      if (project.archived) return;
      if (['on_hold', 'in_progress', 'completed'].includes(project.status)) return;
      const linkedParts = parts.filter(p => p.projectId === project.id);
      const expectedStatus = linkedParts.length === 0
        ? 'planning'
        : linkedParts.every(p => p.delivered) ? 'ready' : 'sourcing';
      if (project.status !== expectedStatus) {
        updateProject(project.id, { status: expectedStatus });
      }
    });
  }, [parts, projects]);

  // Load vehicles when the vehicles tab is accessed and user is authenticated
  useEffect(() => {
    if (userId && activeTab === 'vehicles' && !vehiclesLoadedRef.current) {
      vehiclesLoadedRef.current = true;
      vehiclesLoadedAtRef.current = Date.now();
      loadVehicles();
    }
  }, [activeTab, userId]);

  // Update underline position when active tab changes
  useEffect(() => {
    const updateUnderline = () => {
      const activeTabElement = tabRefs.current[activeTab];
      if (activeTabElement) {
        const { offsetLeft, offsetWidth } = activeTabElement;
        setUnderlineStyle({
          left: offsetLeft,
          width: offsetWidth
        });
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(updateUnderline, 100);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Initial underline position on mount
  useEffect(() => {
    const updateUnderline = () => {
      const activeTabElement = tabRefs.current[activeTab];
      if (activeTabElement) {
        const { offsetLeft, offsetWidth } = activeTabElement;
        setUnderlineStyle({
          left: offsetLeft,
          width: offsetWidth
        });
      }
    };

    // Delay to ensure refs are populated
    const timer = setTimeout(updateUnderline, 100);
    return () => clearTimeout(timer);
  }, []);

  // Swipe gesture handlers for tab navigation
  useEffect(() => {
    const minSwipeDistance = 50;
    const tabs = ['vehicles', 'projects', 'parts'];

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      // Use swipeContainerRef (main container) so swipes work on entire page, including empty areas
      const element = swipeContainerRef.current;
      if (!element || loading) return;

      let touchStartPos = null;
      let touchEndPos = null;
      let isScrolling = false;

      const handleTouchStart = (e) => {
        touchEndPos = null;
        isScrolling = false;
        touchStartPos = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      };

      const handleTouchMove = (e) => {
        if (!touchStartPos) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        const diffX = Math.abs(currentX - touchStartPos.x);
        const diffY = Math.abs(currentY - touchStartPos.y);

        // Detect if user is scrolling vertically
        if (diffY > diffX && diffY > 10) {
          isScrolling = true;
        }

        // If horizontal movement is greater than vertical, prevent scrolling
        if (diffX > diffY && diffX > 10) {
          e.preventDefault();
        }

        touchEndPos = {
          x: currentX,
          y: currentY
        };
      };

      const handleTouchEnd = () => {
        if (!touchStartPos || !touchEndPos) return;

        // Don't trigger tab change if a modal is open (use ref for current value)
        if (modalOpenRef.current) {
          touchStartPos = null;
          touchEndPos = null;
          isScrolling = false;
          return;
        }

        // Don't trigger tab change if user was scrolling vertically
        if (isScrolling) {
          touchStartPos = null;
          touchEndPos = null;
          isScrolling = false;
          return;
        }

        const distance = touchStartPos.x - touchEndPos.x;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe || isRightSwipe) {
          const currentIndex = tabs.indexOf(activeTab);

          if (isLeftSwipe && currentIndex < tabs.length - 1) {
            handleTabChange(tabs[currentIndex + 1]);
          } else if (isRightSwipe && currentIndex > 0) {
            handleTabChange(tabs[currentIndex - 1]);
          }
        }

        touchStartPos = null;
        touchEndPos = null;
        isScrolling = false;
      };

      // Add event listeners with passive: false to allow preventDefault
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd, { passive: true });

      // Store cleanup function
      return () => {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      };
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [activeTab, loading]);

  // Reset scroll position to top when switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // Clear parts filters and close dropdowns when switching tabs
  useEffect(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setVendorFilter('all');
    setPartsDateFilter('all');
    setShowArchivedParts(false);
    setOpenDropdown(null);
    setShowDateFilterDropdown(false);
  }, [activeTab]);

  // Handle email migration result (show toast on success or error)
  useEffect(() => {
    if (migrationResult) {
      if (migrationResult.success) {
        toast.success(
          `Login email updated successfully! Your data has been transferred from ${migrationResult.oldEmail}.`
        );
      } else {
        toast.error(
          migrationResult.error || 'Failed to update login email. Please try again.'
        );
      }
      // Clear the result after showing the toast
      clearMigrationResult();
    }
  }, [migrationResult, clearMigrationResult, toast]);

  // Keyboard navigation for tabs (Shift + Left/Right arrows)
  useEffect(() => {
    const tabs = ['vehicles', 'projects', 'parts'];

    const handleKeyDown = (e) => {
      // Only trigger with Shift key held
      if (!e.shiftKey) return;

      // Don't trigger if a modal is open
      if (modalOpenRef.current) return;

      // Don't interfere with input fields, textareas, or contenteditable elements
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      );

      if (isInputFocused) return;

      const currentIndex = tabs.indexOf(activeTab);

      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        e.preventDefault();
        handleTabChange(tabs[currentIndex - 1]);
      } else if (e.key === 'ArrowRight' && currentIndex < tabs.length - 1) {
        e.preventDefault();
        handleTabChange(tabs[currentIndex + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  // Note: Document and service event loading is now handled in VehicleDetailModal via context

  const handleSort = (field) => {
    // Trigger animation
    setIsSorting(true);
    
    if (sortBy === field) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field with ascending order
      setSortBy(field);
      setSortOrder('asc');
    }
    
    // Remove animation class after animation completes
    setTimeout(() => setIsSorting(false), 400);
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return null;
    return (
      <ChevronUp
        className={`w-4 h-4 transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
      />
    );
  };

  const filteredParts = useMemo(() => {
    let sorted = parts
      .filter(part => {
        // Get project and vehicle for this part
        const partProject = part.projectId ? projects.find(p => p.id === part.projectId) : null;
        // Get vehicle from project or directly from part (for maintenance parts)
        const vehicleId = partProject?.vehicle_id || part.vehicleId;
        const partVehicle = vehicleId ? vehicles.find(v => v.id === vehicleId) : null;
        // Check if this is a maintenance part (has vehicle but no project)
        const isMaintenance = part.vehicleId && !part.projectId;

        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = part.part.toLowerCase().includes(searchLower) ||
                            part.partNumber.toLowerCase().includes(searchLower) ||
                            part.vendor.toLowerCase().includes(searchLower) ||
                            (partProject?.name?.toLowerCase().includes(searchLower)) ||
                            (partVehicle?.name?.toLowerCase().includes(searchLower)) ||
                            (partVehicle?.nickname?.toLowerCase().includes(searchLower)) ||
                            (isMaintenance && 'maintenance'.includes(searchLower));
        const matchesStatus = statusFilter === 'all' ||
                             (statusFilter === 'delivered' && part.delivered) ||
                             (statusFilter === 'shipped' && part.shipped && !part.delivered) ||
                             (statusFilter === 'purchased' && part.purchased && !part.shipped && !part.delivered) ||
                             (statusFilter === 'pending' && !part.purchased);
        const matchesVendor = vendorFilter === 'all' || part.vendor === vendorFilter;
        const matchesDeliveredFilter =
          deliveredFilter === 'all' ? true :
          deliveredFilter === 'only' ? part.delivered :
          deliveredFilter === 'hide' ? !part.delivered && part.purchased : true;

        // Date filter logic
        let matchesDate = true;
        if (partsDateFilter !== 'all' && part.createdAt) {
          const partDate = new Date(part.createdAt);
          const now = new Date();
          const daysDiff = (now - partDate) / (1000 * 60 * 60 * 24);

          if (partsDateFilter === '1week' && daysDiff > 7) {
            matchesDate = false;
          } else if (partsDateFilter === '2weeks' && daysDiff > 14) {
            matchesDate = false;
          } else if (partsDateFilter === '1month' && daysDiff > 30) {
            matchesDate = false;
          }
        }

        // Archive filter logic: show archived only when filter is on, hide archived otherwise
        const matchesArchive = showArchivedParts ? part.archived : !part.archived;

        return matchesSearch && matchesStatus && matchesVendor && matchesDeliveredFilter && matchesDate && matchesArchive;
      })
      .sort((a, b) => {
        let aVal, bVal;
        // Special handling for status sorting
        if (sortBy === 'status') {
          // Assign numeric values: pending=0, purchased=1, shipped=2, delivered=3
          aVal = a.delivered ? 3 : (a.shipped ? 2 : (a.purchased ? 1 : 0));
          bVal = b.delivered ? 3 : (b.shipped ? 2 : (b.purchased ? 1 : 0));
        } else if (sortBy === 'project') {
          // Sort by project name
          const aProject = projects.find(p => p.id === a.projectId);
          const bProject = projects.find(p => p.id === b.projectId);
          aVal = (aProject?.name || '').toLowerCase();
          bVal = (bProject?.name || '').toLowerCase();
          // Sort empty values to the end
          if (!aVal && bVal) return 1;
          if (aVal && !bVal) return -1;
        } else if (sortBy === 'vehicle') {
          // Sort by vehicle name (via project)
          const aProject = projects.find(p => p.id === a.projectId);
          const bProject = projects.find(p => p.id === b.projectId);
          const aVehicle = aProject?.vehicle_id ? vehicles.find(v => v.id === aProject.vehicle_id) : null;
          const bVehicle = bProject?.vehicle_id ? vehicles.find(v => v.id === bProject.vehicle_id) : null;
          aVal = (aVehicle?.nickname || aVehicle?.name || '').toLowerCase();
          bVal = (bVehicle?.nickname || bVehicle?.name || '').toLowerCase();
          // Sort empty values to the end
          if (!aVal && bVal) return 1;
          if (aVal && !bVal) return -1;
        } else {
          aVal = a[sortBy];
          bVal = b[sortBy];
          if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
          }
        }
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    return sorted;
  }, [parts, searchTerm, statusFilter, vendorFilter, sortBy, sortOrder, projects, vehicles, deliveredFilter, partsDateFilter, showArchivedParts]);

  // Get unique vendors from existing parts for the dropdown
  const uniqueVendors = useMemo(() => {
    const vendors = parts
      .map(p => p.vendor)
      .filter(v => v && v.trim() !== '')
      .filter((v, i, arr) => arr.indexOf(v) === i) // unique values
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return vendors;
  }, [parts]);

  const stats = useMemo(() => {
    // Only count non-archived parts for main stats
    const activeParts = parts.filter(p => !p.archived);
    // Filter out pending items (items where purchased is false) for cost calculations
    const purchasedParts = activeParts.filter(p => p.purchased);
    return {
      total: activeParts.length,
      delivered: activeParts.filter(p => p.delivered).length,
      undelivered: activeParts.filter(p => !p.delivered && p.purchased).length,
      shipped: activeParts.filter(p => p.shipped && !p.delivered).length,
      purchased: activeParts.filter(p => p.purchased && !p.shipped && !p.delivered).length,
      pending: activeParts.filter(p => !p.purchased).length,
      totalCost: purchasedParts.reduce((sum, p) => sum + p.total, 0),
      totalPrice: purchasedParts.reduce((sum, p) => sum + p.price, 0),
      totalShipping: purchasedParts.reduce((sum, p) => sum + p.shipping, 0),
      totalDuties: purchasedParts.reduce((sum, p) => sum + p.duties, 0),
      archivedCount: parts.filter(p => p.archived).length,
    };
  }, [parts]);

  // Stats calculated from filtered parts for dynamic cost breakdown
  const filteredStats = useMemo(() => {
    // Filter out pending items (items where purchased is false) for cost calculations
    const purchasedFilteredParts = filteredParts.filter(p => p.purchased);
    return {
      total: filteredParts.length,
      delivered: filteredParts.filter(p => p.delivered).length,
      undelivered: filteredParts.filter(p => !p.delivered).length,
      shipped: filteredParts.filter(p => p.shipped && !p.delivered).length,
      purchased: filteredParts.filter(p => p.purchased && !p.shipped && !p.delivered).length,
      pending: filteredParts.filter(p => !p.purchased).length,
      totalCost: purchasedFilteredParts.reduce((sum, p) => sum + p.total, 0),
      totalPrice: purchasedFilteredParts.reduce((sum, p) => sum + p.price, 0),
      totalShipping: purchasedFilteredParts.reduce((sum, p) => sum + p.shipping, 0),
      totalDuties: purchasedFilteredParts.reduce((sum, p) => sum + p.duties, 0),
    };
  }, [filteredParts]);

  const getStatusIcon = (part) => {
    if (part.delivered) return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (part.shipped) return <Truck className="w-4 h-4 text-blue-600" />;
    if (part.purchased) return <ShoppingCart className="w-4 h-4 text-yellow-600" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const getStatusText = (part) => {
    if (part.delivered) return 'Delivered';
    if (part.shipped) return 'Shipped';
    if (part.purchased) return 'Ordered';
    return 'Pending';
  };

  const getStatusColor = (part) => {
    if (part.delivered) {
      return darkMode
        ? 'bg-green-900/20 text-green-400 border-green-700/50 hover:bg-green-800/40'
        : 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
    }
    if (part.shipped) {
      return darkMode
        ? 'bg-blue-900/20 text-blue-400 border-blue-700/50 hover:bg-blue-800/40'
        : 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200';
    }
    if (part.purchased) {
      return darkMode
        ? 'bg-yellow-900/20 text-yellow-400 border-yellow-700/50 hover:bg-yellow-800/40'
        : 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200';
    }
    return darkMode
      ? 'bg-gray-700 text-gray-400 border-gray-600 hover:bg-gray-600'
      : 'bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300';
  };

  const getStatusTextColor = (part) => {
    if (part.delivered) {
      return darkMode ? 'text-green-400' : 'text-green-700';
    }
    if (part.shipped) {
      return darkMode ? 'text-blue-400' : 'text-blue-700';
    }
    if (part.purchased) {
      return darkMode ? 'text-yellow-400' : 'text-yellow-700';
    }
    return darkMode ? 'text-gray-400' : 'text-gray-700';
  };

  // Note: getTrackingUrl and getCarrierName are imported from utils/trackingUtils.js

  // Don't render main content until mounted on client to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AppProviders darkMode={darkMode} setDarkMode={setDarkMode} userId={userId} toast={toast} isDemo={isDemo}>
    <div
      ref={swipeContainerRef}
      className={`min-h-screen p-3 sm:p-6 pb-20 sm:pb-6 transition-colors duration-200 ${
      darkMode
        ? 'bg-gray-900 dark-scrollbar'
        : 'bg-slate-200'
    }`}>
      <style>{`
        /* Reserve scrollbar space to prevent layout shift */
        html {
          overflow-y: scroll;
          scrollbar-gutter: stable;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .vehicle-dropdown-scroll::-webkit-scrollbar {
          display: none;
        }
        .vehicle-dropdown-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        /* Disable hover and scale effects on touch devices */
        @media (hover: none), (pointer: coarse) {
          * {
            /* Disable all scale transforms on touch devices */
          }
          [class*="hover:scale"],
          [class*="hover:shadow"] {
            transition: none !important;
          }
          [class*="hover:scale"]:hover,
          [class*="hover:scale"]:active {
            transform: none !important;
          }
          .hover\:scale-\[1\.02\]:hover,
          .hover\:scale-\[1\.03\]:hover,
          .hover\:scale-\[1\.02\]:active,
          .hover\:scale-\[1\.03\]:active,
          .hover\:scale-\[1\.02\],
          .hover\:scale-\[1\.03\] {
            transform: none !important;
          }
          .hover\:shadow-lg:hover,
          .hover\:shadow-xl:hover,
          .hover\:shadow-2xl:hover {
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
          }
        }

        /* Custom 800px breakpoint */
        .hidden-below-800 {
          display: none;
        }
        @media (min-width: 948px) {
          .hidden-below-800 {
            display: block;
          }
          .flex-below-800 {
            display: flex;
          }
          .grid-below-800 {
            display: grid;
          }
        }
        .show-below-800 {
          display: block;
        }
        .show-below-800.grid {
          display: grid;
        }
        @media (min-width: 948px) {
          .show-below-800,
          .show-below-800.grid {
            display: none;
          }
        }

        /* Round bottom corners of parts table footer */
        .parts-table-footer {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
        }
      `}</style>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-3 sm:mb-4 min-h-[52px] sm:min-h-[60px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Hamburger Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => {
                    if (!menuHasBeenToggled) setMenuHasBeenToggled(true);
                    if (showUserMenu) {
                      closeMenuWithAnimation();
                    } else {
                      setShowUserMenu(true);
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'hover:bg-gray-700'
                      : 'hover:bg-slate-200'
                  }`}
                  title="Menu"
                >
                  <div className={`hamburger-btn ${!menuHasBeenToggled ? 'initial' : (showUserMenu && !isMenuClosing) ? 'active' : 'not-active'}`}>
                    <span className={darkMode ? 'bg-gray-300' : 'bg-slate-600'}></span>
                    <span className={darkMode ? 'bg-gray-300' : 'bg-slate-600'}></span>
                    <span className={darkMode ? 'bg-gray-300' : 'bg-slate-600'}></span>
                  </div>
                </button>
                {/* User Menu Dropdown */}
                {showUserMenu && (
                  <div className={`absolute left-0 top-full mt-2 w-64 rounded-lg shadow-lg border z-50 ${
                    isMenuClosing ? 'dropdown-fade-out' : 'dropdown-fade-in'
                  } ${
                    darkMode
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-white border-slate-200'
                  }`}>
                    {/* User Info */}
                    <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        {isDemo ? (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            darkMode ? 'bg-amber-700' : 'bg-amber-200'
                          }`}>
                            <Play className={`w-5 h-5 ${darkMode ? 'text-amber-100' : 'text-amber-700'}`} />
                          </div>
                        ) : user?.user_metadata?.avatar_url ? (
                          <img
                            src={user.user_metadata.avatar_url}
                            alt="Avatar"
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            darkMode ? 'bg-gray-700' : 'bg-slate-200'
                          }`}>
                            <span className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                              {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${darkMode ? 'text-gray-100' : 'text-slate-800'}`}>
                            {isDemo ? 'Demo User' : (user?.user_metadata?.full_name || 'User')}
                          </p>
                          <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                            {isDemo ? 'demo@example.com' : user?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Menu Options */}
                    <div className="p-2">
                      {/* Dark Mode Toggle */}
                      <button
                        onClick={() => {
                          setDarkMode(!darkMode);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          darkMode
                            ? 'hover:bg-gray-700 text-gray-100'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {darkMode ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-indigo-500" />}
                        <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                      </button>
                      {/* Update Login Email - Hidden in demo mode */}
                      {!isDemo && (
                        <button
                          onClick={() => {
                            closeMenuWithAnimation();
                            setShowUpdateEmailModal(true);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                            darkMode
                              ? 'hover:bg-gray-700 text-gray-100'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <Mail className="w-5 h-5" />
                          <span>Update Login Email</span>
                        </button>
                      )}
                      {/* Sign Out / Exit Demo */}
                      <button
                        onClick={() => {
                          closeMenuWithAnimation();
                          if (isDemo) {
                            exitDemoMode();
                          } else {
                            signOut();
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          darkMode
                            ? 'hover:bg-gray-700 text-gray-100'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <LogOut className="w-5 h-5" />
                        <span>{isDemo ? 'Exit Demo' : 'Sign Out'}</span>
                      </button>
                      {/* Divider and Delete Account - Hidden in demo mode */}
                      {!isDemo && (
                        <>
                          <div className={`my-2 border-t ${darkMode ? 'border-gray-700' : 'border-slate-200'}`} />
                          {/* Delete Account */}
                          <button
                            onClick={() => {
                              closeMenuWithAnimation();
                              setShowDeleteAccountModal(true);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                              darkMode
                                ? 'hover:bg-red-900/30 text-red-400'
                                : 'hover:bg-red-50 text-red-600'
                            }`}
                          >
                            <Trash2 className="w-5 h-5" />
                            <span>Delete Account</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <img src="/icon.png" alt="Shako" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${
                darkMode ? 'text-gray-100' : 'text-slate-800'
              }`} style={{ fontFamily: "'FoundationOne', 'Courier New', monospace" }}>Shako</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 min-h-[44px]">
              {/* Filter Dropdowns - Animated on tab change only when filter is not 'all' */}
              {(activeTab === 'projects' || activeTab === 'parts') && (
                <div
                  key={projectVehicleFilter === 'all' && partsDateFilter === 'all' ? 'filter-all' : activeTab}
                  className={(() => {
                    // Always animate when coming from vehicles tab (filters are appearing)
                    // Otherwise only animate if a filter is active (not 'all')
                    if (previousTab !== 'vehicles' && projectVehicleFilter === 'all' && partsDateFilter === 'all') return '';
                    return 'slide-in-top';
                  })()}>
              {/* Vehicle Filter - Only visible on Projects tab */}
              {activeTab === 'projects' && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowVehicleFilterDropdown(!showVehicleFilterDropdown);
                    }}
                    className={`px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-left flex items-center justify-between gap-2 ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-gray-100'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                    style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif' }}
                  >
                    <div className="flex items-center gap-2">
                      {projectVehicleFilter !== 'all' && (() => {
                        const selectedVehicle = vehicles.find(v => String(v.id) === String(projectVehicleFilter));
                        return selectedVehicle ? (
                          <>
                            <div 
                              className="w-3 h-3 rounded-full border"
                              style={{ 
                                backgroundColor: selectedVehicle.color || '#3B82F6',
                                borderColor: darkMode ? '#4B5563' : '#D1D5DB'
                              }}
                            />
                            <span className="hidden sm:inline">{selectedVehicle.nickname || selectedVehicle.name}</span>
                          </>
                        ) : null;
                      })()}
                      {projectVehicleFilter === 'all' && <span>All</span>}
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showVehicleFilterDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={closeVehicleFilterDropdown}
                      />
                      <div className={`absolute right-0 z-20 mt-1 min-w-[200px] w-max rounded-lg border shadow-lg py-1 ${
                        vehicleFilterDropdownClosing ? 'dropdown-fade-out' : 'dropdown-fade-in'
                      } ${
                        darkMode ? 'bg-gray-800 border-gray-600' : 'bg-slate-50 border-slate-300'
                      }`} style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif' }}>
                        <div className={`px-3 py-1.5 text-xs font-medium uppercase tracking-tight border-b whitespace-nowrap ${
                          darkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-slate-200'
                        }`}>
                          Filter by Vehicle
                        </div>
                        <button
                          onClick={() => {
                            setIsFilteringProjects(true);
                            setProjectVehicleFilter('all');
                            closeVehicleFilterDropdown();
                            setTimeout(() => setIsFilteringProjects(false), 500);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                            projectVehicleFilter === 'all'
                              ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                              : darkMode ? 'hover:bg-gray-700 text-gray-100' : 'hover:bg-gray-100 text-gray-900'
                          }`}
                        >
                          All
                        </button>
                        {vehicles.filter(vehicle => !vehicle.archived).length === 0 ? (
                          <div className={`px-3 py-2 text-sm text-center italic ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            No active vehicles
                          </div>
                        ) : (
                          vehicles.filter(vehicle => !vehicle.archived).map(vehicle => (
                          <button
                            key={vehicle.id}
                            onClick={() => {
                              setIsFilteringProjects(true);
                              setProjectVehicleFilter(String(vehicle.id));
                              closeVehicleFilterDropdown();
                              setTimeout(() => setIsFilteringProjects(false), 500);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                              String(projectVehicleFilter) === String(vehicle.id)
                                ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                                : darkMode ? 'hover:bg-gray-700 text-gray-100' : 'hover:bg-gray-100 text-gray-900'
                            }`}
                          >
                            <div
                              className="w-3 h-3 rounded-full border flex-shrink-0"
                              style={{
                                backgroundColor: vehicle.color || '#3B82F6',
                                borderColor: darkMode ? '#4B5563' : '#D1D5DB'
                              }}
                            />
                            <span className="truncate">
                              {vehicle.nickname ? `${vehicle.nickname} (${vehicle.name})` : vehicle.name}
                            </span>
                          </button>
                        ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              {/* Date Filter - Only visible on Parts tab */}
              {activeTab === 'parts' && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDateFilterDropdown(!showDateFilterDropdown);
                    }}
                    className={`px-3 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-left flex items-center justify-between gap-2 ${
                      darkMode
                        ? 'bg-gray-800 border-gray-600 text-gray-100'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                    style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif' }}
                  >
                    <span>
                      {partsDateFilter === 'all' && 'All'}
                      {partsDateFilter === '1week' && <><span className="hidden sm:inline">1 week</span><span className="sm:hidden">1w</span></>}
                      {partsDateFilter === '2weeks' && <><span className="hidden sm:inline">2 weeks</span><span className="sm:hidden">2w</span></>}
                      {partsDateFilter === '1month' && <><span className="hidden sm:inline">1 month</span><span className="sm:hidden">1m</span></>}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showDateFilterDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={closeDateFilterDropdown}
                      />
                      <div className={`absolute right-0 z-20 mt-1 w-auto rounded-lg border shadow-lg py-1 ${
                        dateFilterDropdownClosing ? 'dropdown-fade-out' : 'dropdown-fade-in'
                      } ${
                        darkMode ? 'bg-gray-800 border-gray-600' : 'bg-slate-50 border-slate-300'
                      }`} style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif' }}>
                        <div className={`px-3 py-1.5 text-xs font-medium uppercase tracking-tight border-b whitespace-nowrap ${
                          darkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-slate-200'
                        }`}>
                          Filter by age
                        </div>
                        <button
                          onClick={() => {
                            setIsFilteringParts(true);
                            setPartsDateFilter('all');
                            closeDateFilterDropdown();
                            setTimeout(() => setIsFilteringParts(false), 500);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm ${
                            partsDateFilter === 'all'
                              ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                              : darkMode ? 'hover:bg-gray-700 text-gray-100' : 'hover:bg-gray-100 text-gray-900'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => {
                            setIsFilteringParts(true);
                            setPartsDateFilter('1week');
                            closeDateFilterDropdown();
                            setTimeout(() => setIsFilteringParts(false), 500);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm ${
                            partsDateFilter === '1week'
                              ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                              : darkMode ? 'hover:bg-gray-700 text-gray-100' : 'hover:bg-gray-100 text-gray-900'
                          }`}
                        >
                          1 week
                        </button>
                        <button
                          onClick={() => {
                            setIsFilteringParts(true);
                            setPartsDateFilter('2weeks');
                            closeDateFilterDropdown();
                            setTimeout(() => setIsFilteringParts(false), 500);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm ${
                            partsDateFilter === '2weeks'
                              ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                              : darkMode ? 'hover:bg-gray-700 text-gray-100' : 'hover:bg-gray-100 text-gray-900'
                          }`}
                        >
                          2 weeks
                        </button>
                        <button
                          onClick={() => {
                            setIsFilteringParts(true);
                            setPartsDateFilter('1month');
                            closeDateFilterDropdown();
                            setTimeout(() => setIsFilteringParts(false), 500);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm ${
                            partsDateFilter === '1month'
                              ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                              : darkMode ? 'hover:bg-gray-700 text-gray-100' : 'hover:bg-gray-100 text-gray-900'
                          }`}
                        >
                          1 month
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
                </div>
              )}
              {/* Vehicle Layout Toggle - only visible on vehicles tab */}
              {activeTab === 'vehicles' && (
                <div
                  onClick={() => {
                    const newMode = vehicleLayoutMode === 'default' ? 'compact' : 'default';
                    setVehicleLayoutMode(newMode);
                    localStorage.setItem('vehicleLayoutMode', newMode);
                  }}
                  className={`slide-in-top relative flex items-center rounded-lg border cursor-pointer ${
                    darkMode ? 'bg-gray-800 border-gray-600' : 'bg-slate-100 border-slate-300'
                  }`}
                >
                  {/* Sliding background indicator */}
                  <div
                    className={`absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-md transition-all duration-200 ease-in-out ${
                      darkMode ? 'bg-green-600' : 'bg-green-500'
                    } ${
                      vehicleLayoutMode === 'compact' ? 'translate-x-full' : 'translate-x-0'
                    }`}
                  />
                  {/* Default layout icon */}
                  <div
                    className={`relative z-10 p-2 sm:p-3 flex items-center justify-center rounded-md transition-colors duration-200 ${
                      vehicleLayoutMode === 'default'
                        ? 'text-white'
                        : darkMode ? 'text-gray-400' : 'text-slate-500'
                    }`}
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  {/* Compact layout icon */}
                  <div
                    className={`relative z-10 p-2 sm:p-3 flex items-center justify-center rounded-md transition-colors duration-200 ${
                      vehicleLayoutMode === 'compact'
                        ? 'text-white'
                        : darkMode ? 'text-gray-400' : 'text-slate-500'
                    }`}
                  >
                    <LayoutList className="w-5 h-5" />
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  if (activeTab === 'parts') setShowAddPartOptionsModal(true);
                  else if (activeTab === 'projects') setShowAddProjectModal(true);
                  else if (activeTab === 'vehicles') setShowAddVehicleModal(true);
                }}
                className={`p-2 sm:px-4 sm:py-2.5 rounded-lg shadow-md transition-colors bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 sm:min-w-[149px] justify-center font-medium ${
                  darkMode ? '' : ''
                }`}
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">
                  {activeTab === 'vehicles' ? 'New vehicle' : activeTab === 'projects' ? 'New project' : 'New part'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Demo Mode Banner */}
        {isDemo && (
          <div className={`mb-3 px-3 py-2 rounded-lg flex items-center justify-between text-sm ${
            darkMode
              ? 'bg-amber-900/30 border border-amber-700/50 text-amber-300'
              : 'bg-amber-100 border border-amber-300 text-amber-800'
          }`}>
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              <span className="font-medium">Demo Mode</span>
              <span className={`hidden sm:inline ${darkMode ? 'text-amber-400/70' : 'text-amber-600/70'}`}>
                — Changes are saved locally
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetDemo}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  darkMode
                    ? 'hover:bg-amber-800/50 text-amber-300'
                    : 'hover:bg-amber-200 text-amber-700'
                }`}
              >
                Reset
              </button>
              <button
                onClick={exitDemoMode}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  darkMode
                    ? 'bg-amber-700/50 hover:bg-amber-700 text-amber-100'
                    : 'bg-amber-200 hover:bg-amber-300 text-amber-800'
                }`}
              >
                Exit Demo
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation - Hidden on mobile, shown on sm and up */}
        <div className={`hidden sm:block mb-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-slate-300'
        }`}>
          <div className="flex relative">
            <button
              ref={(el) => (tabRefs.current['vehicles'] = el)}
              onClick={() => handleTabChange('vehicles')}
              onMouseEnter={() => !isTouchDevice && setHoverTab('vehicles')}
              onMouseLeave={() => !isTouchDevice && setHoverTab(null)}
              onTouchStart={() => setHoverTab(null)}
              className={`flex items-center justify-center sm:justify-start gap-2 flex-1 sm:flex-initial px-3 sm:px-6 py-3 font-medium transition-all relative z-10 ${
                activeTab === 'vehicles'
                  ? darkMode
                    ? 'text-blue-400'
                    : 'text-blue-600'
                  : darkMode
                    ? 'text-gray-400'
                    : 'text-slate-600'
              }`}
            >
              <Car className="w-5 h-5" />
              <span className="text-sm sm:text-base">Vehicles</span>
            </button>
            <button
              ref={(el) => (tabRefs.current['projects'] = el)}
              onClick={() => handleTabChange('projects')}
              onMouseEnter={() => !isTouchDevice && setHoverTab('projects')}
              onMouseLeave={() => !isTouchDevice && setHoverTab(null)}
              onTouchStart={() => setHoverTab(null)}
              className={`flex items-center justify-center sm:justify-start gap-2 flex-1 sm:flex-initial px-3 sm:px-6 py-3 font-medium transition-all relative z-10 ${
                activeTab === 'projects'
                  ? darkMode
                    ? 'text-blue-400'
                    : 'text-blue-600'
                  : darkMode
                    ? 'text-gray-400'
                    : 'text-slate-600'
              }`}
            >
              <ListChecks className="w-5 h-5" />
              <span className="text-sm sm:text-base">Projects</span>
            </button>
            <button
              ref={(el) => (tabRefs.current['parts'] = el)}
              onClick={() => handleTabChange('parts')}
              onMouseEnter={() => !isTouchDevice && setHoverTab('parts')}
              onMouseLeave={() => !isTouchDevice && setHoverTab(null)}
              onTouchStart={() => setHoverTab(null)}
              className={`flex items-center justify-center sm:justify-start gap-2 flex-1 sm:flex-initial px-3 sm:px-6 py-3 font-medium transition-all relative z-10 ${
                activeTab === 'parts'
                  ? darkMode
                    ? 'text-blue-400'
                    : 'text-blue-600'
                  : darkMode
                    ? 'text-gray-400'
                    : 'text-slate-600'
              }`}
            >
              {activeTab === 'parts' ? <PackageOpen className="w-5 h-5" /> : <Package className="w-5 h-5" />}
              <span className="text-sm sm:text-base">Parts</span>
            </button>
            {/* Animated hover background */}
            {hoverTab && tabRefs.current[hoverTab] && (
              <div
                className={`absolute top-0 bottom-1 rounded-lg transition-all duration-300 ease-out ${
                  darkMode ? 'bg-gray-700/50' : 'bg-slate-300/60'
                }`}
                style={{
                  left: `${tabRefs.current[hoverTab].offsetLeft}px`,
                  width: `${tabRefs.current[hoverTab].offsetWidth}px`
                }}
              />
            )}
            {/* Animated underline */}
            <div
              className={`absolute bottom-0 h-0.5 transition-all duration-300 ease-out z-10 ${
                darkMode ? 'bg-blue-400' : 'bg-blue-600'
              }`}
              style={{
                left: `${underlineStyle.left}px`,
                width: `${underlineStyle.width}px`
              }}
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="garage-spinner mx-auto mb-4">
                <div className="door-segment"></div>
                <div className="door-segment"></div>
                <div className="door-segment"></div>
                <div className="door-segment"></div>
              </div>
              <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-slate-600'}`}>Opening your garage...</p>
            </div>
          </div>
        )}

        {/* Content - Only show when not loading */}
        {!loading && (
          <>
        {/* Add Part Options Modal */}
        <AddPartOptionsModal
          isOpen={showAddPartOptionsModal}
          darkMode={darkMode}
          isModalClosing={isModalClosing}
          handleCloseModal={handleCloseModal}
          onClose={() => setShowAddPartOptionsModal(false)}
          onSinglePartClick={() => {
            setShowAddPartOptionsModal(false);
            setShowAddModal(true);
          }}
          onCSVUpload={(file) => {
            setCsvFile(file);
            setShowAddPartOptionsModal(false);
            setShowCSVImportModal(true);
          }}
        />

        {/* CSV Import Modal */}
        <CSVImportModal
          isOpen={showCSVImportModal}
          darkMode={darkMode}
          csvFile={csvFile}
          projects={projects}
          isModalClosing={isModalClosing}
          handleCloseModal={handleCloseModal}
          onClose={() => {
            setShowCSVImportModal(false);
            setCsvFile(null);
          }}
          onImport={async (partsToImport) => {
            const importedCount = await importPartsFromCSV(partsToImport);
            setShowCSVImportModal(false);
            setCsvFile(null);
            if (importedCount > 0) {
              toast.success(`Successfully imported ${importedCount} part${importedCount !== 1 ? 's' : ''}`);
            }
          }}
        />

        {/* Add New Part Modal */}
        <AddPartModal
          isOpen={showAddModal}
          darkMode={darkMode}
          newPart={newPart}
          setNewPart={setNewPart}
          projects={projects}
          vehicles={vehicles}
          uniqueVendors={uniqueVendors}
          isModalClosing={isModalClosing}
          handleCloseModal={handleCloseModal}
          addNewPart={handleAddNewPart}
          onClose={() => {
            setShowAddModal(false);
            // Reset form to initial state
            setNewPart({
              part: '',
              partNumber: '',
              vendor: '',
              price: '',
              shipping: '',
              duties: '',
              tracking: '',
              status: 'pending',
              projectId: null,
              vehicleId: null
            });
            // Return to originating project view if this was opened from one
            const ctx = addPartReturnContext;
            if (ctx) {
              setAddPartReturnContext(null);
              returnToAddPartContext(ctx);
            }
          }}
          setConfirmDialog={setConfirmDialog}
        />

        {/* Tracking Info Modal */}
        <TrackingModal
          isOpen={showTrackingModal}
          darkMode={darkMode}
          trackingInput={trackingInput}
          setTrackingInput={setTrackingInput}
          skipTrackingInfo={handleSkipTrackingInfo}
          saveTrackingInfo={handleSaveTrackingInfo}
          onClose={() => {
            setShowTrackingModal(false);
            setTrackingModalPartId(null);
            setTrackingInput('');
          }}
        />

        {/* Part Detail Modal */}
        <PartDetailModal
          isOpen={showPartDetailModal}
          darkMode={darkMode}
          viewingPart={viewingPart}
          editingPart={editingPart}
          partDetailView={partDetailView}
          setPartDetailView={setPartDetailView}
          setEditingPart={setEditingPart}
          setOriginalPartData={setOriginalPartData}
          projects={projects}
          vehicles={vehicles}
          parts={parts}
          uniqueVendors={uniqueVendors}
          vendorColors={vendorColors}
          isModalClosing={isModalClosing}
          handleCloseModal={handleCloseModal}
          saveEditedPart={handleSaveEditedPart}
          deletePart={deletePart}
          archivePart={archivePart}
          setConfirmDialog={setConfirmDialog}
          setShowPartDetailModal={setShowPartDetailModal}
          setViewingPart={setViewingPart}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
          getStatusText={getStatusText}
          onRefreshTracking={updatePartTrackingData}
          onCourierChange={updateCourierOverride}
          onStatusChange={handlePartDetailStatusChange}
          filteredParts={filteredParts}
          setShowTrackingModal={setShowTrackingModal}
          setTrackingModalPartId={setTrackingModalPartId}
          hasUnsavedPartChanges={hasUnsavedPartChanges}
          createPartDirectly={createPartDirectly}
        />

        {/* PARTS TAB CONTENT */}
        {activeTab === 'parts' && (
          <PartsTab
            tabContentRef={tabContentRef}
            stats={stats}
            filteredStats={filteredStats}
            parts={parts}
            filteredParts={filteredParts}
            darkMode={darkMode}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            deliveredFilter={deliveredFilter}
            setDeliveredFilter={setDeliveredFilter}
            vendorFilter={vendorFilter}
            setVendorFilter={setVendorFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            isSorting={isSorting}
            setIsSorting={setIsSorting}
            isStatusFiltering={isStatusFiltering}
            setIsStatusFiltering={setIsStatusFiltering}
            isSearching={isSearching}
            setIsSearching={setIsSearching}
            isFilteringParts={isFilteringParts}
            showArchivedParts={showArchivedParts}
            setShowArchivedParts={setShowArchivedParts}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            projects={projects}
            vehicles={vehicles}
            vendorColors={vendorColors}
            setShowAddModal={setShowAddModal}
            setShowPartDetailModal={setShowPartDetailModal}
            setViewingPart={setViewingPart}
            updatePartStatus={handleUpdatePartStatus}
            updatePartProject={updatePartProject}
            handleSort={handleSort}
            getSortIcon={getSortIcon}
            getStatusIcon={getStatusIcon}
            getStatusText={getStatusText}
            getStatusColor={getStatusColor}
            getVendorColor={getVendorColor}
            onVendorClick={() => setShowManageVendorsModal(true)}
          />
        )}

        {/* PROJECTS TAB CONTENT */}
        {activeTab === 'projects' && (
          <ProjectsTab
            tabContentRef={tabContentRef}
            previousTab={previousTab}
            projects={projects}
            parts={parts}
            vehicles={vehicles}
            darkMode={darkMode}
            projectVehicleFilter={projectVehicleFilter}
            setProjectVehicleFilter={setProjectVehicleFilter}
            isFilteringProjects={isFilteringProjects}
            showVehicleFilterDropdown={showVehicleFilterDropdown}
            setShowVehicleFilterDropdown={setShowVehicleFilterDropdown}
            isProjectArchiveCollapsed={isProjectArchiveCollapsed}
            setIsProjectArchiveCollapsed={setIsProjectArchiveCollapsed}
            projectArchiveRef={projectArchiveRef}
            draggedProject={draggedProject}
            setDraggedProject={setDraggedProject}
            dragOverProject={dragOverProject}
            setDragOverProject={setDragOverProject}
            dragOverProjectArchiveZone={dragOverProjectArchiveZone}
            setDragOverProjectArchiveZone={setDragOverProjectArchiveZone}
            showAddProjectModal={showAddProjectModal}
            setShowAddProjectModal={setShowAddProjectModal}
            showProjectDetailModal={showProjectDetailModal}
            setShowProjectDetailModal={setShowProjectDetailModal}
            viewingProject={viewingProject}
            setViewingProject={setViewingProject}
            setProjectModalEditMode={setProjectModalEditMode}
            newProject={newProject}
            setNewProject={setNewProject}
            handleDragStart={handleDragStart}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={handleDrop}
            handleDragEnd={handleDragEnd}
            handleProjectArchiveZoneDrop={handleProjectArchiveZoneDrop}
            calculateProjectStatus={calculateProjectStatus}
            addProject={addProject}
            updateProject={updateProject}
            deleteProject={deleteProject}
            unlinkPartFromProject={unlinkPartFromProject}
            loadProjects={loadProjects}
            getStatusColors={getStatusColors}
            getPriorityColors={getPriorityColors}
            getStatusText={getStatusText}
            getStatusTextColor={getStatusTextColor}
            getVendorColor={getVendorColor}
            calculateProjectTotal={calculateProjectTotal}
            isModalClosing={isModalClosing}
            handleCloseModal={handleCloseModal}
            hasUnsavedProjectChanges={hasUnsavedProjectChanges}
            setConfirmDialog={setConfirmDialog}
            projectModalEditMode={projectModalEditMode}
            setProjectModalEditMode={setProjectModalEditMode}
            originalProjectData={originalProjectData}
            setOriginalProjectData={setOriginalProjectData}
            editingTodoId={editingTodoId}
            setEditingTodoId={setEditingTodoId}
            editingTodoText={editingTodoText}
            setEditingTodoText={setEditingTodoText}
            newTodoText={newTodoText}
            setNewTodoText={setNewTodoText}
            vendorColors={vendorColors}
            showAddProjectVehicleDropdown={showAddProjectVehicleDropdown}
            setShowAddProjectVehicleDropdown={setShowAddProjectVehicleDropdown}
            setActiveTab={setActiveTab}
            archivePart={archivePart}
            onAddPartFromProject={handleAddPartFromProject}
            setShowPartDetailModal={setShowPartDetailModal}
            setViewingPart={setViewingPart}
          />
        )}

        {/* VEHICLES TAB CONTENT */}
        {activeTab === 'vehicles' && (
          <VehiclesTab
            tabContentRef={tabContentRef}
            vehicles={vehicles}
            projects={projects}
            parts={parts}
            darkMode={darkMode}
            layoutMode={vehicleLayoutMode}
            draggedVehicle={draggedVehicle}
            setDraggedVehicle={setDraggedVehicle}
            dragOverVehicle={dragOverVehicle}
            setDragOverVehicle={setDragOverVehicle}
            dragOverArchiveZone={dragOverArchiveZone}
            setDragOverArchiveZone={setDragOverArchiveZone}
            isArchiveCollapsed={isArchiveCollapsed}
            setIsArchiveCollapsed={setIsArchiveCollapsed}
            archiveRef={vehicleArchiveRef}
            setShowAddVehicleModal={setShowAddVehicleModal}
            setShowVehicleDetailModal={setShowVehicleDetailModal}
            setViewingVehicle={setViewingVehicle}
            setVehicleModalEditMode={setVehicleModalEditMode}
            handleVehicleDragStart={handleVehicleDragStart}
            handleVehicleDragOver={handleVehicleDragOver}
            handleVehicleDragLeave={handleVehicleDragLeave}
            handleVehicleDrop={handleVehicleDrop}
            handleVehicleDragEnd={handleVehicleDragEnd}
            handleArchiveZoneDrop={handleArchiveZoneDrop}
            getVehicleProjects={getVehicleProjects}
            showAddVehicleModal={showAddVehicleModal}
            newVehicle={newVehicle}
            setNewVehicle={setNewVehicle}
            vehicleImagePreview={vehicleImagePreview}
            setVehicleImagePreview={setVehicleImagePreview}
            vehicleImageFile={vehicleImageFile}
            setVehicleImageFile={setVehicleImageFile}
            uploadingImage={uploadingImage}
            setUploadingImage={setUploadingImage}
            isDraggingImage={isDraggingImage}
            setIsDraggingImage={setIsDraggingImage}
            isModalClosing={isModalClosing}
            handleCloseModal={handleCloseModal}
            addVehicle={addVehicle}
            uploadVehicleImage={uploadVehicleImage}
            handleImageFileChange={handleImageFileChange}
            handleImageDragEnter={handleImageDragEnter}
            handleImageDragLeave={handleImageDragLeave}
            handleImageDragOver={handleImageDragOver}
            handleImageDrop={handleImageDrop}
            clearImageSelection={clearImageSelection}
            vehicleImageFiles={vehicleImageFiles}
            setVehicleImageFiles={setVehicleImageFiles}
            MAX_VEHICLE_IMAGES={MAX_VEHICLE_IMAGES}
            addImageFile={addImageFile}
            removeImageFile={removeImageFile}
            setPrimaryImageFile={setPrimaryImageFile}
            uploadMultipleVehicleImages={uploadMultipleVehicleImages}
            deleteVehicleImageFromStorage={deleteVehicleImageFromStorage}
            getPrimaryImageUrl={getPrimaryImageUrl}
            showVehicleDetailModal={showVehicleDetailModal}
            viewingVehicle={viewingVehicle}
            vehicleModalEditMode={vehicleModalEditMode}
            vehicleModalProjectView={vehicleModalProjectView}
            setVehicleModalProjectView={setVehicleModalProjectView}
            originalVehicleData={originalVehicleData}
            setOriginalVehicleData={setOriginalVehicleData}
            updateVehicle={updateVehicle}
            deleteVehicle={deleteVehicle}
            loadVehicles={loadVehicles}
            getStatusColors={getStatusColors}
            getPriorityColors={getPriorityColors}
            getStatusText={getStatusText}
            getStatusTextColor={getStatusTextColor}
            getVendorColor={getVendorColor}
            calculateProjectTotal={calculateProjectTotal}
            calculateProjectStatus={calculateProjectStatus}
            hasUnsavedVehicleChanges={hasUnsavedVehicleChanges}
            setConfirmDialog={setConfirmDialog}
            editingTodoId={editingTodoId}
            setEditingTodoId={setEditingTodoId}
            editingTodoText={editingTodoText}
            setEditingTodoText={setEditingTodoText}
            newTodoText={newTodoText}
            setNewTodoText={setNewTodoText}
            vendorColors={vendorColors}
            unlinkPartFromProject={unlinkPartFromProject}
            loadProjects={loadProjects}
            loadParts={loadParts}
            updateProject={updateProject}
            addProject={addProject}
            createPartDirectly={createPartDirectly}
            deleteProject={deleteProject}
            deletePart={deletePart}
            toast={toast}
            setActiveTab={setActiveTab}
            archivePart={archivePart}
            onAddPartFromProject={handleAddPartFromVehicleProject}
          />
        )}

        </>
        )}
      </div>
      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        isDangerous={confirmDialog.isDangerous !== false}
        darkMode={darkMode}
        secondaryAction={confirmDialog.secondaryAction}
        secondaryText={confirmDialog.secondaryText}
        secondaryDangerous={confirmDialog.secondaryDangerous}
      />
      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={deleteAccount}
        darkMode={darkMode}
        userEmail={user?.email}
      />
      {/* Manage Vendors Modal */}
      <ManageVendorsModal
        isOpen={showManageVendorsModal}
        onClose={() => setShowManageVendorsModal(false)}
        darkMode={darkMode}
        uniqueVendors={uniqueVendors}
        vendorColors={vendorColors}
        parts={parts}
        editingVendor={editingVendor}
        setEditingVendor={setEditingVendor}
        updateVendorColor={updateVendorColor}
        renameVendor={handleRenameVendor}
        deleteVendor={handleDeleteVendor}
        setConfirmDialog={setConfirmDialog}
        isModalClosing={isModalClosing}
        handleCloseModal={handleCloseModal}
      />
      {/* Update Login Email Modal */}
      <UpdateLoginEmailModal
        isOpen={showUpdateEmailModal}
        onClose={() => setShowUpdateEmailModal(false)}
        onInitiateMigration={initiateEmailMigration}
        darkMode={darkMode}
        userEmail={user?.email}
      />
      {/* New User Confirmation Modal */}
      <NewUserConfirmModal
        isOpen={!!pendingNewUser}
        onConfirm={confirmNewUser}
        onCancel={cancelNewUser}
        email={pendingNewUser?.email}
        darkMode={darkMode}
        isLoading={authLoading}
      />

      {/* Mobile Bottom Tab Navigation - Glassmorphism style */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t backdrop-blur-xl ${
          darkMode
            ? 'bg-gray-900/50 border-white/10'
            : 'bg-white/50 border-black/5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]'
        }`}
      >
        <div
          className="flex justify-around items-center pt-3 pb-2"
          style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={() => handleTabChange('vehicles')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'vehicles'
                ? darkMode ? 'text-blue-400' : 'text-blue-600'
                : darkMode ? 'text-gray-400' : 'text-slate-500'
            }`}
          >
            <Car className="w-5 h-5" />
            <span className="text-xs mt-1">Vehicles</span>
          </button>
          <button
            onClick={() => handleTabChange('projects')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'projects'
                ? darkMode ? 'text-blue-400' : 'text-blue-600'
                : darkMode ? 'text-gray-400' : 'text-slate-500'
            }`}
          >
            <ListChecks className="w-5 h-5" />
            <span className="text-xs mt-1">Projects</span>
          </button>
          <button
            onClick={() => handleTabChange('parts')}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              activeTab === 'parts'
                ? darkMode ? 'text-blue-400' : 'text-blue-600'
                : darkMode ? 'text-gray-400' : 'text-slate-500'
            }`}
          >
            {activeTab === 'parts' ? <PackageOpen className="w-5 h-5" /> : <Package className="w-5 h-5" />}
            <span className="text-xs mt-1">Parts</span>
          </button>
        </div>
      </div>
    </div>
    <ToastContainer toasts={toasts} onDismiss={dismissToast} darkMode={darkMode} />
    </AppProviders>
  );
};

export default Shako;
