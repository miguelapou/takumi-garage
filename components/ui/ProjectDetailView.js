import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { Package, CheckCircle, CheckSquare, ChevronDown, X, Archive, Car, LayoutGrid, Table } from 'lucide-react';
import { getVendorDisplayColor } from '../../utils/colorUtils';
import { toSentenceCase } from '../../utils/styleUtils';
import ConfirmDialog from './ConfirmDialog';

// ProjectDetailView - Reusable component for displaying project details with todos and linked parts
const ProjectDetailView = ({
  project,
  parts,
  vehicles,
  darkMode,
  updateProject,
  getStatusColors,
  getPriorityColors,
  getStatusText,
  getStatusTextColor,
  getVendorColor,
  vendorColors,
  calculateProjectTotal,
  editingTodoId,
  setEditingTodoId,
  editingTodoText,
  setEditingTodoText,
  newTodoText,
  setNewTodoText,
  onNavigateToTab,
  onViewPart
}) => {
  const linkedParts = parts.filter(part => part.projectId === project.id);
  const linkedPartsTotal = calculateProjectTotal(project.id, parts);
  const progress = project.budget > 0 ? (linkedPartsTotal / project.budget) * 100 : 0;
  const statusColors = getStatusColors(darkMode);
  const priorityColors = getPriorityColors(darkMode);

  // FLIP animation for todos
  const todoRefs = useRef({});
  const prevPositions = useRef({});
  const isAnimatingRef = useRef(false);
  const hasInitialized = useRef(false);
  const [isNewTodoFocused, setIsNewTodoFocused] = useState(false);
  // Refs to prevent race condition between onKeyDown and onBlur handlers
  const isSubmittingNewTodoRef = useRef(false);
  const isSubmittingEditTodoRef = useRef(false);
  const [showCompletedTodos, setShowCompletedTodos] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDescriptionClamped, setIsDescriptionClamped] = useState(false);
  const [showTodoProgress, setShowTodoProgress] = useState(false);
  const [isPartsHovered, setIsPartsHovered] = useState(false);
  const descriptionRef = useRef(null);

  const localStorageKey = `partsViewMode_${project.id}`;
  const [partsViewMode, setPartsViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(localStorageKey) || 'table';
    }
    return 'table';
  });

  const togglePartsViewMode = () => {
    const newMode = partsViewMode === 'cards' ? 'table' : 'cards';
    setPartsViewMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(localStorageKey, newMode);
    }
  };

  // Refs and state for animated progress bar height
  const progressGridRef = useRef(null);
  const leftColumnRef = useRef(null);
  const twoColumnGridRef = useRef(null);
  const [progressGridHeight, setProgressGridHeight] = useState(165);

  // Check if description is clamped (content overflows the collapsed height)
  useEffect(() => {
    if (descriptionRef.current && project.description) {
      const content = descriptionRef.current;
      // 4.5em at 16px base = 72px collapsed height
      const collapsedHeight = 72;
      setIsDescriptionClamped(content.scrollHeight > collapsedHeight);
    }
  }, [project.description]);

  // Calculate and animate progress grid height based on available space
  useEffect(() => {
    const calculateHeight = () => {
      if (!leftColumnRef.current || !progressGridRef.current) return;

      // Temporarily set height to auto so it doesn't constrain the layout measurement
      progressGridRef.current.style.transition = 'none';
      progressGridRef.current.style.height = 'auto';

      // Force a reflow to get accurate measurements
      void twoColumnGridRef.current?.offsetHeight;

      // Get the left column's total height (matches right column via CSS Grid)
      const leftColumn = leftColumnRef.current;
      const leftColumnHeight = leftColumn.clientHeight;

      // Get the description section height (first child)
      const descriptionSection = leftColumn.querySelector('.lg\\:min-h-\\[6\\.5rem\\]');
      const descriptionHeight = descriptionSection ? descriptionSection.offsetHeight : 0;

      // Account for gap (24px = gap-6)
      const gap = 24;

      // Calculate available height for progress grid
      const availableHeight = leftColumnHeight - descriptionHeight - gap;

      // Clamp to min/max bounds
      const clampedHeight = Math.min(Math.max(availableHeight, 165), 300);

      // Set height directly first (no transition)
      progressGridRef.current.style.height = `${progressGridHeight}px`;

      // Re-enable transition and animate to new height
      requestAnimationFrame(() => {
        if (progressGridRef.current) {
          progressGridRef.current.style.transition = '';
          setProgressGridHeight(clampedHeight);
        }
      });
    };

    // Calculate on mount and when todos change
    const timeoutId = setTimeout(calculateHeight, 50);

    // Use ResizeObserver to recalculate when the two-column grid resizes
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(calculateHeight, 50);
    });
    if (twoColumnGridRef.current) {
      resizeObserver.observe(twoColumnGridRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [project.todos, showCompletedTodos, isDescriptionExpanded, progressGridHeight]);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Reset on project change
  useEffect(() => {
    hasInitialized.current = false;
    prevPositions.current = {};
  }, [project.id]);

  // Sort todos:
  // - Checked first, then unchecked
  // - Within checked: by completed_at (oldest first, newest at bottom)
  // - Within unchecked: unchecked items at top (by created_at desc), new items at bottom (by created_at asc)
  // - Use id as tiebreaker to ensure stable sorting
  const sortedTodos = useMemo(() => {
    if (!project.todos) return [];
    return [...project.todos].sort((a, b) => {
      // Different completion status: completed items first
      if (a.completed !== b.completed) {
        return b.completed - a.completed;
      }
      // Both have same completion status
      if (a.completed) {
        // Both completed: sort by completed_at (oldest first, newest at bottom)
        const aCompletedAt = a.completed_at ? new Date(a.completed_at).getTime() : new Date(a.created_at).getTime();
        const bCompletedAt = b.completed_at ? new Date(b.completed_at).getTime() : new Date(b.created_at).getTime();
        if (aCompletedAt !== bCompletedAt) return aCompletedAt - bCompletedAt;
        return a.id - b.id; // Stable tiebreaker
      } else {
        // Both uncompleted:
        // - "Unchecked" todos (created_at != original_created_at) go to TOP, sorted by created_at desc
        // - "New" todos (created_at == original_created_at) go to BOTTOM, sorted by created_at asc
        const aCreatedAt = new Date(a.created_at).getTime();
        const bCreatedAt = new Date(b.created_at).getTime();
        const aOriginalCreatedAt = a.original_created_at ? new Date(a.original_created_at).getTime() : aCreatedAt;
        const bOriginalCreatedAt = b.original_created_at ? new Date(b.original_created_at).getTime() : bCreatedAt;

        const aWasUnchecked = Math.abs(aCreatedAt - aOriginalCreatedAt) > 1000; // More than 1 second difference
        const bWasUnchecked = Math.abs(bCreatedAt - bOriginalCreatedAt) > 1000;

        // Unchecked items come before new items
        if (aWasUnchecked !== bWasUnchecked) {
          return aWasUnchecked ? -1 : 1;
        }

        if (aWasUnchecked) {
          // Both were unchecked: most recently unchecked first
          if (aCreatedAt !== bCreatedAt) return bCreatedAt - aCreatedAt;
          return b.id - a.id;
        } else {
          // Both are new: oldest first (newest at bottom)
          if (aCreatedAt !== bCreatedAt) return aCreatedAt - bCreatedAt;
          return a.id - b.id;
        }
      }
    });
  }, [project.todos]);

  // FLIP animation with useLayoutEffect for synchronous execution
  useLayoutEffect(() => {
    // Helper to get element position without any active transforms
    const getCleanPosition = (element) => {
      if (!element) return null;
      // Temporarily clear transform to get true layout position
      const currentTransform = element.style.transform;
      element.style.transform = '';
      const pos = element.getBoundingClientRect().top;
      element.style.transform = currentTransform;
      return pos;
    };

    // On first render, capture positions synchronously
    if (!hasInitialized.current) {
      sortedTodos.forEach(todo => {
        const element = todoRefs.current[todo.id];
        if (element) {
          prevPositions.current[todo.id] = getCleanPosition(element);
        }
      });
      hasInitialized.current = true;
      return; // Don't animate on first render
    }

    // If animation is in progress, still update positions but skip new animation
    if (isAnimatingRef.current) {
      sortedTodos.forEach(todo => {
        const element = todoRefs.current[todo.id];
        if (element) {
          prevPositions.current[todo.id] = getCleanPosition(element);
        }
      });
      return;
    }

    // Capture the old positions
    const oldPositions = { ...prevPositions.current };
    const hasOldPositions = Object.keys(oldPositions).length > 0;

    // Collect new positions
    const newPositions = {};
    sortedTodos.forEach(todo => {
      const element = todoRefs.current[todo.id];
      if (element) {
        newPositions[todo.id] = getCleanPosition(element);
      }
    });

    // Calculate all deltas to detect layout shifts
    const deltas = [];
    sortedTodos.forEach(todo => {
      const oldPos = oldPositions[todo.id];
      const newPos = newPositions[todo.id];
      if (oldPos !== undefined && newPos !== undefined) {
        deltas.push(oldPos - newPos);
      }
    });

    // Detect layout shift: if most items shifted by the same amount, subtract it
    // This happens when the "Completed" section header appears/disappears
    let layoutShift = 0;
    if (deltas.length > 2) {
      // Find the most common delta (mode) with some tolerance
      const tolerance = 5;
      const deltaCounts = {};
      deltas.forEach(d => {
        const rounded = Math.round(d / tolerance) * tolerance;
        deltaCounts[rounded] = (deltaCounts[rounded] || 0) + 1;
      });

      let maxCount = 0;
      let modeValue = 0;
      Object.entries(deltaCounts).forEach(([val, count]) => {
        if (count > maxCount) {
          maxCount = count;
          modeValue = parseFloat(val);
        }
      });

      // If more than half the items shifted by the same amount, it's a layout shift
      if (maxCount > deltas.length / 2 && Math.abs(modeValue) > 10) {
        layoutShift = modeValue;
      }
    }

    // Track if any animation will run
    let willAnimate = false;

    // Now set up animations and update stored positions
    sortedTodos.forEach(todo => {
      const element = todoRefs.current[todo.id];
      if (element) {
        const newPos = newPositions[todo.id];
        const oldPos = oldPositions[todo.id];

        if (hasOldPositions && oldPos !== undefined && newPos !== oldPos) {
          // Calculate delta, subtracting the layout shift
          const rawDelta = oldPos - newPos;
          const deltaY = rawDelta - layoutShift;

          // Only animate if there's meaningful movement after accounting for layout shift
          if (Math.abs(deltaY) > 5 && Math.abs(deltaY) < 500) {
            willAnimate = true;
            element.style.transform = `translateY(${deltaY}px)`;
            element.style.transition = 'none';
          }
        }
        // Store new position for next time
        prevPositions.current[todo.id] = newPos;
      }
    });

    // Start animations if any elements need to move
    if (willAnimate) {
      isAnimatingRef.current = true;
      requestAnimationFrame(() => {
        sortedTodos.forEach(todo => {
          const element = todoRefs.current[todo.id];
          if (element && element.style.transform) {
            element.style.transition = 'transform 0.3s ease-out';
            element.style.transform = 'translateY(0)';
          }
        });
        // Clear animation state after animation completes
        setTimeout(() => {
          isAnimatingRef.current = false;
          sortedTodos.forEach(todo => {
            const element = todoRefs.current[todo.id];
            if (element) {
              element.style.transition = '';
            }
          });
        }, 300);
      });
    }
  }, [sortedTodos]);

  const renderTodoItem = (todo) => (
    <div
      key={todo.id}
      ref={(el) => todoRefs.current[todo.id] = el}
      className={`flex items-center gap-3 py-1.5 px-3 rounded-lg border transition-colors ${
        editingTodoId === todo.id
          ? darkMode
            ? 'bg-gray-700 border-blue-500'
            : 'bg-gray-50 border-blue-500'
          : darkMode
            ? 'bg-gray-700 border-gray-600 hover:border-white'
            : 'bg-gray-50 border-gray-300 hover:border-gray-400'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const updatedTodos = project.todos.map(t => {
            if (t.id === todo.id) {
              const newCompleted = !t.completed;
              return {
                ...t,
                completed: newCompleted,
                completed_at: newCompleted ? new Date().toISOString() : null,
                // Update created_at when unchecking so it goes to top of uncompleted list
                created_at: !newCompleted ? new Date().toISOString() : t.created_at,
                // Preserve original_created_at or set it if missing (for old todos)
                original_created_at: t.original_created_at || t.created_at
              };
            }
            return t;
          });

          // Check if unchecking results in no completed todos - set status to planning
          // But never change on_hold status - that's only controlled by pause/resume button
          const hasCompletedTodos = updatedTodos.some(t => t.completed);
          const updates = { todos: updatedTodos };
          if (!hasCompletedTodos && project.status !== 'planning' && project.status !== 'on_hold') {
            updates.status = 'planning';
          }

          updateProject(project.id, updates);
        }}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-150 active:scale-90 ${
          todo.completed
            ? darkMode
              ? 'bg-green-600 border-green-600 scale-100'
              : 'bg-green-500 border-green-500 scale-100'
            : darkMode
              ? 'border-gray-500 hover:border-gray-400 scale-100'
              : 'border-gray-400 hover:border-gray-500 scale-100'
        }`}
      >
        <CheckSquare
          className={`w-4 h-4 text-white transition-all duration-150 ${
            todo.completed ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
        />
      </button>
      {/* Todo Text - Click to edit inline */}
      {editingTodoId === todo.id ? (
        <textarea
          ref={(el) => {
            if (el) {
              el.focus({ preventScroll: true });
              // Set initial height based on content
              el.style.height = 'auto';
              el.style.height = el.scrollHeight + 'px';
            }
          }}
          type="text"
          value={editingTodoText}
          onChange={(e) => {
            setEditingTodoText(e.target.value);
            // Auto-resize textarea
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (editingTodoText.trim()) {
                isSubmittingEditTodoRef.current = true;
                const formattedText = toSentenceCase(editingTodoText.trim());
                const updatedTodos = project.todos.map(t =>
                  t.id === todo.id ? { ...t, text: formattedText } : t
                );
                updateProject(project.id, {
                  todos: updatedTodos
                });
                setEditingTodoId(null);
                setEditingTodoText('');
                e.target.blur();
              }
            } else if (e.key === 'Escape') {
              isSubmittingEditTodoRef.current = true;
              setEditingTodoId(null);
              setEditingTodoText('');
              e.target.blur();
            }
          }}
          onBlur={() => {
            // Skip if already submitted via Enter or Escape
            if (isSubmittingEditTodoRef.current) {
              isSubmittingEditTodoRef.current = false;
              return;
            }
            if (editingTodoText.trim() && editingTodoText !== todo.text) {
              const formattedText = toSentenceCase(editingTodoText.trim());
              const updatedTodos = project.todos.map(t =>
                t.id === todo.id ? { ...t, text: formattedText } : t
              );
              updateProject(project.id, {
                todos: updatedTodos
              });
            }
            setEditingTodoId(null);
            setEditingTodoText('');
          }}
          inputMode="text"
          rows="1"
          className={`flex-1 text-base bg-transparent border-0 focus:outline-none resize-none overflow-hidden ${
            darkMode
              ? 'text-gray-100'
              : 'text-gray-800'
          }`}
          style={{
            fontSize: '16px !important',
            lineHeight: '1.5 !important',
            padding: '0 !important',
            backgroundColor: 'transparent !important',
            border: '0 !important',
            margin: '0 !important',
            boxShadow: 'none !important',
            appearance: 'none',
            WebkitAppearance: 'none',
            minHeight: '24px'
          }}
        />
      ) : (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setEditingTodoId(todo.id);
            setEditingTodoText(todo.text);
          }}
          className={`flex-1 text-base cursor-pointer hover:opacity-70 transition-opacity ${
            todo.completed
              ? darkMode
                ? 'text-gray-500 line-through'
                : 'text-gray-400 line-through'
              : darkMode
                ? 'text-gray-200'
                : 'text-gray-800'
          }`}
          style={{ lineHeight: '1.5' }}
          title="Click to edit"
        >
          {todo.text}
        </span>
      )}
      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setConfirmDialog({
            isOpen: true,
            title: 'Delete To-Do',
            message: 'Are you sure you want to delete this to-do item? This action cannot be undone.',
            onConfirm: () => {
              const updatedTodos = project.todos.filter(t => t.id !== todo.id);

              // Check if deletion results in no completed todos or no todos at all - set status to planning
              // But never change on_hold status - that's only controlled by pause/resume button
              const hasCompletedTodos = updatedTodos.some(t => t.completed);
              const updates = { todos: updatedTodos };
              if ((!hasCompletedTodos || updatedTodos.length === 0) && project.status !== 'planning' && project.status !== 'on_hold') {
                updates.status = 'planning';
              }

              updateProject(project.id, updates);
            }
          });
        }}
        className={`flex-shrink-0 p-1 rounded transition-colors ${
          darkMode
            ? 'text-gray-500 hover:text-red-400 hover:bg-gray-600'
            : 'text-gray-400 hover:text-red-600 hover:bg-gray-200'
        }`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <>
      {/* Status Badge (left) and Priority (right) on same row */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
            statusColors[project.status]
          } ${!darkMode ? 'ring-1 ring-inset ring-current' : ''}`}>
            {project.status.replace('_', ' ').toUpperCase()}
          </span>
          {project.archived && (
            <span data-tooltip="Archived" className="instant-tooltip flex items-center">
              <Archive className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </span>
          )}
        </div>
        {/* Vehicle badge and Priority */}
        <div className="flex items-center gap-4">
          {/* Vehicle badge */}
          {project.vehicle_id && vehicles && (() => {
            const vehicle = vehicles.find(v => v.id === project.vehicle_id);
            return vehicle ? (
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                  darkMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                <Car className="w-3 h-3 mr-1" />
                <span style={{ color: vehicle.color || '#3B82F6' }}>
                  {vehicle.nickname || vehicle.name}
                </span>
              </span>
            ) : null;
          })()}
          {/* Priority */}
          <div className="text-right">
            <p className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
              Priority</p>
            <p className={`text-lg font-bold ${priorityColors[project.priority]}`}>
              {project.priority === 'not_set' ? 'NONE' : (
                project.priority === 'medium' ? (
                  <>
                    <span className="lg:hidden">MED</span>
                    <span className="hidden lg:inline">MEDIUM</span>
                  </>
                ) : project.priority?.replace(/_/g, ' ').toUpperCase()
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Project Details (Left) and Todo List (Right) */}
      <div ref={twoColumnGridRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column: Project Details */}
        <div ref={leftColumnRef} className="flex flex-col gap-6">
          {/* Description */}
          <div className="lg:min-h-[6.5rem]">
            <h3 className={`text-lg font-semibold mb-2 ${
              darkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>Description</h3>
            <div className="relative">
              <div
                className="overflow-hidden transition-all duration-500 ease-in-out"
                style={{
                  maxHeight: isDescriptionExpanded ? '1000px' : '4.5em'
                }}
              >
                <p
                  ref={descriptionRef}
                  className={`text-base lg:min-h-[4.5em] ${
                    project.description
                      ? (darkMode ? 'text-gray-400' : 'text-slate-600')
                      : (darkMode ? 'text-gray-500 italic' : 'text-gray-500 italic')
                  }`}
                >
                  {project.description || 'No description added'}
                </p>
              </div>
              {project.description && isDescriptionClamped ? (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className={`mt-2 flex items-center gap-1 text-sm font-medium transition-colors ${
                    darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  {isDescriptionExpanded ? 'Show less' : 'Show more'}
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${
                    isDescriptionExpanded ? 'rotate-180' : ''
                  }`} />
                </button>
              ) : (
                /* Reserve space for "Show more" button on desktop for consistent layout */
                <div className="hidden lg:block mt-2 h-5" />
              )}
            </div>
          </div>

          {/* Progress Section - Different layouts for mobile vs desktop */}

          {/* Mobile: Circular Progress Bars */}
          <div className="flex items-end justify-center gap-6 flex-1 lg:hidden">
            {/* Circular Progress Bars - Clickable */}
            <button
              onClick={() => setShowTodoProgress(!showTodoProgress)}
              className="relative cursor-pointer hover:opacity-80 transition-opacity"
              style={{ width: '120px', height: '120px' }}
              title="Click to toggle between Budget and To-Do progress"
            >
              {/* Budget Progress Circle (outer) */}
              <svg
                className={`w-full h-full transform -rotate-90 transition-opacity duration-300 ${showTodoProgress ? 'opacity-40' : 'opacity-100'}`}
                viewBox="0 0 120 120"
              >
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke={darkMode ? '#374151' : '#e5e7eb'}
                  strokeWidth="12"
                />
                {/* Progress circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke={progress > 90 ? '#ef4444' : progress > 70 ? '#eab308' : '#22c55e'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - Math.max(Math.min(progress, 100) / 100, 0.01))}
                  className="transition-all duration-500"
                />
              </svg>
              {/* Todo Progress Circle (inner) */}
              <svg
                className={`absolute top-0 left-0 w-full h-full transform -rotate-90 transition-opacity duration-300 ${showTodoProgress ? 'opacity-100' : 'opacity-40'}`}
                viewBox="0 0 120 120"
              >
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="36"
                  fill="none"
                  stroke={darkMode ? '#374151' : '#e5e7eb'}
                  strokeWidth="10"
                />
                {/* Progress circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="36"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 36}
                  strokeDashoffset={2 * Math.PI * 36 * (1 - Math.max((project.todos?.filter(t => t.completed).length || 0) / (project.todos?.length || 1), 0.01))}
                  className="transition-all duration-500"
                />
              </svg>
              {/* Center percentage display - alternates on click with shrink/expand */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`absolute text-sm font-bold transition-all duration-300 ${darkMode ? 'text-gray-200' : 'text-gray-700'} ${!showTodoProgress ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                >
                  {progress.toFixed(0)}%
                </span>
                <span
                  className={`absolute text-sm font-bold transition-all duration-300 ${darkMode ? 'text-gray-200' : 'text-gray-700'} ${showTodoProgress ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
                >
                  {Math.round((project.todos?.filter(t => t.completed).length || 0) / (project.todos?.length || 1) * 100)}%
                </span>
              </div>
            </button>

            {/* Mobile Legend */}
            <div className="space-y-3">
              {/* Budget Legend */}
              <button
                onClick={() => setShowTodoProgress(false)}
                className={`flex items-center gap-2 ${!showTodoProgress ? 'opacity-100' : 'opacity-50'} transition-opacity hover:opacity-80 cursor-pointer`}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: progress > 90 ? '#ef4444' : progress > 70 ? '#eab308' : '#22c55e' }}
                />
                <div className="text-left">
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Budget
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    ${linkedPartsTotal.toFixed(2)} / ${Math.round(project.budget || 0)}
                  </p>
                </div>
              </button>
              {/* Todo Legend */}
              <button
                onClick={() => setShowTodoProgress(true)}
                className={`flex items-center gap-2 ${showTodoProgress ? 'opacity-100' : 'opacity-50'} transition-opacity hover:opacity-80 cursor-pointer`}
              >
                <div className="w-4 h-4 rounded-full bg-violet-500" />
                <div className="text-left">
                  <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    To-Dos
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {project.todos?.filter(t => t.completed).length || 0} / {project.todos?.length || 0} completed
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Desktop: Vertical Bar Graphs (3 equal columns) */}
          <div
            ref={progressGridRef}
            className="hidden lg:grid lg:grid-cols-3 lg:gap-4 transition-all duration-300 ease-out"
            style={{ height: progressGridHeight }}
          >
            {/* Column 1: Budget Bar */}
            <div className="flex flex-col items-end pr-2 transition-all duration-300">
              <div className="flex flex-col items-center flex-1 transition-all duration-300">
                <div
                  className={`w-14 rounded-lg relative overflow-hidden flex-1 transition-all duration-300 ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-300'
                  }`}
                  style={{
                    borderBottom: `3px solid ${progress > 90 ? '#ef4444' : progress > 70 ? '#eab308' : '#22c55e'}`
                  }}
                >
                  {/* Budget fill from bottom */}
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                    style={{
                      height: `${Math.min(progress, 100)}%`,
                      backgroundColor: progress > 90 ? '#ef4444' : progress > 70 ? '#eab308' : '#22c55e'
                    }}
                  />
                </div>
                <p className={`text-xs font-bold mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {progress.toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Column 2: To-Dos Bar */}
            <div className="flex flex-col items-center transition-all duration-300">
              <div className="flex flex-col items-center flex-1 transition-all duration-300">
                <div
                  className={`w-14 rounded-lg relative overflow-hidden flex-1 transition-all duration-300 ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-300'
                  }`}
                  style={{
                    borderBottom: '3px solid #8b5cf6'
                  }}
                >
                  {/* Todo fill from bottom */}
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-all duration-500 bg-violet-500"
                    style={{
                      height: `${Math.round((project.todos?.filter(t => t.completed).length || 0) / (project.todos?.length || 1) * 100)}%`
                    }}
                  />
                </div>
                <p className={`text-xs font-bold mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {Math.round((project.todos?.filter(t => t.completed).length || 0) / (project.todos?.length || 1) * 100)}%
                </p>
              </div>
            </div>

            {/* Column 3: Legend */}
            <div className="flex flex-col justify-end transition-all duration-300">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded flex-shrink-0"
                    style={{ backgroundColor: progress > 90 ? '#ef4444' : progress > 70 ? '#eab308' : '#22c55e' }}
                  />
                  <div>
                    <p className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Budget
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      ${linkedPartsTotal.toFixed(2)} / ${Math.round(project.budget || 0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-violet-500 flex-shrink-0" />
                  <div>
                    <p className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      To-Dos
                    </p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {project.todos?.filter(t => t.completed).length || 0} / {project.todos?.length || 0} done
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: To-Do List Section */}
        <div>
          <div className="mb-3">
            <h3 className={`text-lg font-semibold ${
              darkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              To-Do List
            </h3>
          </div>
          {/* To-Do Items */}
          <div className="space-y-2">
            {/* Checked Todos Section (Collapsible) */}
            {sortedTodos.some(todo => todo.completed) && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowCompletedTodos(!showCompletedTodos)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-gray-700/50 border-gray-600 hover:border-gray-500 text-gray-300'
                      : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <CheckSquare className={`w-4 h-4 transition-colors ${
                      showCompletedTodos
                        ? ''
                        : 'text-green-500'
                    }`} />
                    Completed ({sortedTodos.filter(todo => todo.completed).length})
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                    showCompletedTodos ? 'rotate-180' : ''
                  }`} />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    showCompletedTodos
                      ? 'max-h-[2000px] opacity-100'
                      : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="space-y-2">
                    {sortedTodos.filter(todo => todo.completed).map(renderTodoItem)}
                  </div>
                </div>
              </div>
            )}
            {/* Unchecked Todos */}
            {sortedTodos.filter(todo => !todo.completed).map(renderTodoItem)}
            {/* Always-visible input for new todos */}
            <div
              className={`flex items-center gap-3 py-1.5 px-3 rounded-lg border transition-colors ${
                isNewTodoFocused
                  ? darkMode
                    ? 'bg-gray-700 border-blue-500'
                    : 'bg-gray-50 border-blue-500'
                  : darkMode
                    ? 'bg-gray-700 border-gray-600 hover:border-white'
                    : 'bg-gray-50 border-gray-300 hover:border-gray-400'
              }`}
            >
              {/* Empty checkbox placeholder */}
              <div className={`flex-shrink-0 w-5 h-5 rounded border-2 ${
                darkMode ? 'border-gray-600' : 'border-gray-300'
              }`} />
              {/* Input field - auto-expanding textarea */}
              <textarea
                type="text"
                value={newTodoText}
                onChange={(e) => {
                  setNewTodoText(e.target.value);
                  // Auto-resize textarea
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                onFocus={() => setIsNewTodoFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newTodoText.trim()) {
                      isSubmittingNewTodoRef.current = true;
                      const currentTodos = project.todos || [];
                      const timestamp = new Date().toISOString();
                      const newTodo = {
                        id: Date.now(),
                        text: toSentenceCase(newTodoText.trim()),
                        completed: false,
                        created_at: timestamp,
                        original_created_at: timestamp
                      };
                      updateProject(project.id, {
                        todos: [...currentTodos, newTodo]
                      });
                      setNewTodoText('');
                      // Reset height after clearing
                      setTimeout(() => {
                        if (e.target) {
                          e.target.style.height = 'auto';
                        }
                      }, 0);
                    }
                  }
                }}
                onBlur={(e) => {
                  setIsNewTodoFocused(false);
                  // Skip if already submitted via Enter
                  if (isSubmittingNewTodoRef.current) {
                    isSubmittingNewTodoRef.current = false;
                    return;
                  }
                  if (newTodoText.trim()) {
                    const currentTodos = project.todos || [];
                    const timestamp = new Date().toISOString();
                    const newTodo = {
                      id: Date.now(),
                      text: toSentenceCase(newTodoText.trim()),
                      completed: false,
                      created_at: timestamp,
                      original_created_at: timestamp
                    };
                    updateProject(project.id, {
                      todos: [...currentTodos, newTodo]
                    });
                    setNewTodoText('');
                    // Reset height after clearing
                    setTimeout(() => {
                      if (e.target) {
                        e.target.style.height = 'auto';
                      }
                    }, 0);
                  }
                }}
                placeholder="Add a to-do item..."
                inputMode="text"
                rows="1"
                className={`flex-1 text-base px-2 py-1 bg-transparent border-0 focus:outline-none resize-none overflow-hidden ${
                  darkMode
                    ? 'text-gray-100 placeholder-gray-500'
                    : 'text-gray-800 placeholder-gray-400'
                }`}
                style={{ fontSize: '16px', lineHeight: '1.5', minHeight: '24px' }}
              />
            </div>
          </div>
        </div>
        {/* End of two-column grid */}
      </div>

      {/* Linked Parts List - Full Width Below */}
      {linkedParts.length > 0 && (
        <div className={`pt-6 border-t ${
          darkMode ? 'border-gray-700' : 'border-slate-300'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-lg font-semibold ${
              darkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                <span>Linked Parts ({linkedParts.length})</span>
              </div>
            </h3>
            <div
              onClick={togglePartsViewMode}
              className={`hidden md:relative md:flex items-center rounded-lg border cursor-pointer ${
                darkMode ? 'bg-gray-800 border-gray-600' : 'bg-slate-100 border-slate-300'
              }`}
            >
              {/* Sliding background indicator */}
              <div
                className={`absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-md transition-all duration-200 ease-in-out ${
                  darkMode ? 'bg-blue-600' : 'bg-blue-500'
                } ${
                  partsViewMode === 'table' ? 'translate-x-full' : 'translate-x-0'
                }`}
              />
              {/* Cards icon */}
              <div
                className={`relative z-10 p-1.5 flex items-center justify-center rounded-md transition-colors duration-200 ${
                  partsViewMode === 'cards' ? 'text-white' : darkMode ? 'text-gray-400' : 'text-slate-500'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </div>
              {/* Table icon */}
              <div
                className={`relative z-10 p-1.5 flex items-center justify-center rounded-md transition-colors duration-200 ${
                  partsViewMode === 'table' ? 'text-white' : darkMode ? 'text-gray-400' : 'text-slate-500'
                }`}
              >
                <Table className="w-4 h-4" />
              </div>
            </div>
          </div>
          {partsViewMode === 'table' && (
            <div className={`hidden md:block rounded-lg border overflow-hidden ${
              darkMode ? 'border-gray-600' : 'border-gray-300'
            }`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                    <th className={`text-left px-3 py-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Part</th>
                    <th className={`text-left px-3 py-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Vendor</th>
                    <th className={`text-left px-3 py-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Status</th>
                    <th className={`text-right px-3 py-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Price</th>
                    <th className={`text-right px-3 py-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Shipping</th>
                    <th className={`text-right px-3 py-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Duties</th>
                    <th className={`text-right px-3 py-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedParts.map((part, index) => (
                    <tr
                      key={part.id}
                      onClick={() => onViewPart && onViewPart(part)}
                      className={`border-t ${
                        darkMode
                          ? `border-gray-600 bg-gray-900 ${onViewPart ? 'hover:bg-gray-800' : ''}`
                          : `border-gray-200 bg-white ${onViewPart ? 'hover:bg-gray-50' : ''}`
                      } ${onViewPart ? 'cursor-pointer' : ''}`}
                    >
                      <td className={`px-3 py-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        <div>{part.part}{(part.quantity || 1) > 1 ? ` ×${part.quantity}` : ''}</div>
                        <div className={`text-xs font-mono h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {part.partNumber && part.partNumber !== '-' ? part.partNumber : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {part.vendor && (
                          vendorColors[part.vendor] ? (
                            (() => {
                              const colors = getVendorDisplayColor(vendorColors[part.vendor], darkMode);
                              return (
                                <span
                                  className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border"
                                  style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
                                >
                                  {part.vendor}
                                </span>
                              );
                            })()
                          ) : (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getVendorColor(part.vendor, vendorColors)}`}>
                              {part.vendor}
                            </span>
                          )
                        )}
                      </td>
                      <td className={`px-3 py-2 text-xs font-medium ${getStatusTextColor(part)}`}>
                        {getStatusText(part)}
                      </td>
                      <td className={`px-3 py-2 text-right ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        ${part.price.toFixed(2)}
                      </td>
                      <td className={`px-3 py-2 text-right ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {part.shipping > 0 ? `$${part.shipping.toFixed(2)}` : '—'}
                      </td>
                      <td className={`px-3 py-2 text-right ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {part.duties > 0 ? `$${part.duties.toFixed(2)}` : '—'}
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        ${part.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${partsViewMode === 'table' ? 'md:hidden' : ''}`}>
            {linkedParts.map((part) => (
              <div
                key={part.id}
                onClick={() => onViewPart && onViewPart(part)}
                className={`p-4 rounded-lg border flex flex-col ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'
                } ${onViewPart ? 'cursor-pointer' : ''}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className={`font-medium ${
                      darkMode ? 'text-gray-100' : 'text-slate-800'
                    }`}>
                      {part.part}{(part.quantity || 1) > 1 ? ` - x${part.quantity}` : ''}
                    </h4>
                    {part.vendor && (
                      vendorColors[part.vendor] ? (
                        (() => {
                          const colors = getVendorDisplayColor(vendorColors[part.vendor], darkMode);
                          return (
                            <span
                              className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                              style={{
                                backgroundColor: colors.bg,
                                color: colors.text,
                                borderColor: colors.border
                              }}
                            >
                              {part.vendor}
                            </span>
                          );
                        })()
                      ) : (
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getVendorColor(part.vendor, vendorColors)}`}>
                          {part.vendor}
                        </span>
                      )
                    )}
                  </div>
                  <div className={`text-xs font-medium ${getStatusTextColor(part)}`}>
                    {getStatusText(part)}
                  </div>
                </div>
                {part.partNumber && part.partNumber !== '-' && (
                  <p className={`text-xs font-mono mb-3 ${
                    darkMode ? 'text-gray-400' : 'text-slate-600'
                  }`}>
                    Part #: {part.partNumber}
                  </p>
                )}
                <div className={`border-t flex-1 flex flex-col justify-end ${
                  darkMode ? 'border-gray-600' : 'border-gray-300'
                }`}>
                  <div className="pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={darkMode ? 'text-gray-400' : 'text-slate-600'}>
                        Part Price:
                      </span>
                      <span className={`font-medium ${
                        darkMode ? 'text-gray-200' : 'text-gray-800'
                      }`}>
                        ${part.price.toFixed(2)}
                      </span>
                    </div>
                    {part.shipping > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className={darkMode ? 'text-gray-400' : 'text-slate-600'}>
                          Shipping:
                        </span>
                        <span className={`font-medium ${
                          darkMode ? 'text-gray-200' : 'text-gray-800'
                        }`}>
                          ${part.shipping.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {part.duties > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className={darkMode ? 'text-gray-400' : 'text-slate-600'}>
                          Duties:
                        </span>
                        <span className={`font-medium ${
                          darkMode ? 'text-gray-200' : 'text-gray-800'
                        }`}>
                          ${part.duties.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className={`flex justify-between text-base font-bold pt-2 border-t ${
                      darkMode ? 'border-gray-600' : 'border-gray-300'
                    }`}>
                      <span className={darkMode ? 'text-gray-100' : 'text-slate-800'}>
                        Total:
                      </span>
                      <span className={darkMode ? 'text-gray-100' : 'text-slate-800'}>
                        ${part.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State for Linked Parts */}
      {linkedParts.length === 0 && (
        <div className={`pt-6 border-t ${
          darkMode ? 'border-gray-700' : 'border-slate-300'
        }`}>
          <h3 className={`text-lg font-semibold mb-3 ${
            darkMode ? 'text-gray-200' : 'text-gray-800'
          }`}>
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <span>Linked Parts</span>
            </div>
          </h3>
          <button
            onClick={() => onNavigateToTab && onNavigateToTab('parts')}
            onMouseEnter={() => setIsPartsHovered(true)}
            onMouseLeave={() => setIsPartsHovered(false)}
            className={`text-center py-8 rounded-lg border w-full cursor-pointer transition-colors ${
              darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-300'
            }`}
            style={{ color: isPartsHovered ? (darkMode ? '#60a5fa' : '#2563eb') : (darkMode ? '#9ca3af' : '#6b7280') }}
          >
            <Package className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              No parts linked
            </p>
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        darkMode={darkMode}
      />
    </>
  );
};

export default ProjectDetailView;
