import React from 'react';
import {
  Plus, ChevronDown, ChevronRight, GripVertical,
  Package, CheckCircle, Clock, Car, Archive, ListChecks, FolderLock, FolderOpen
} from 'lucide-react';
import { getStatusColors, getPriorityColors, getMutedColor, getPriorityBorderColor } from '../../utils/colorUtils';
import { calculateProjectTotal } from '../../utils/dataUtils';
import { cardBg, primaryText, secondaryText } from '../../utils/styleUtils';
import AddProjectModal from '../modals/AddProjectModal';
import ProjectDetailModal from '../modals/ProjectDetailModal';

const ProjectsTab = ({
  tabContentRef,
  previousTab,
  projects,
  parts,
  vehicles,
  darkMode,
  projectVehicleFilter,
  setProjectVehicleFilter,
  isFilteringProjects,
  setIsFilteringProjects,
  showVehicleFilterDropdown,
  setShowVehicleFilterDropdown,
  isProjectArchiveCollapsed,
  setIsProjectArchiveCollapsed,
  draggedProject,
  setDraggedProject,
  dragOverProject,
  setDragOverProject,
  dragOverProjectArchiveZone,
  setDragOverProjectArchiveZone,
  setShowAddProjectModal,
  showProjectDetailModal,
  setShowProjectDetailModal,
  setViewingProject,
  setProjectModalEditMode,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragEnd,
  handleProjectArchiveZoneDrop,
  calculateProjectStatus,
  // Additional props for modals and functionality
  projectArchiveRef,
  setOriginalProjectData,
  showAddProjectModal,
  newProject,
  setNewProject,
  showAddProjectVehicleDropdown,
  setShowAddProjectVehicleDropdown,
  isModalClosing,
  handleCloseModal,
  addProject,
  viewingProject,
  projectModalEditMode,
  originalProjectData,
  vendorColors,
  editingTodoId,
  setEditingTodoId,
  editingTodoText,
  setEditingTodoText,
  newTodoText,
  setNewTodoText,
  hasUnsavedProjectChanges,
  updateProject,
  deleteProject,
  unlinkPartFromProject,
  loadProjects,
  getStatusText,
  getStatusTextColor,
  getVendorColor,
  setConfirmDialog,
  setActiveTab,
  archivePart,
  onAddPartFromProject,
  setShowPartDetailModal,
  setViewingPart
}) => {
  return (
    <div
      ref={tabContentRef}
      className={previousTab === 'vehicles' ? 'slide-in-left' : 'slide-in-right'}
    >
      <>
        {/* Projects Grid */}
        <div className={`projects-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${isFilteringProjects ? 'projects-filtering' : ''}`}>
          {projects
            .filter(project => !project.archived)
            .filter(project => {
              if (projectVehicleFilter === 'all') return true;
              // Convert both to strings for comparison since select values are strings
              return String(project.vehicle_id) === String(projectVehicleFilter);
            })
            .map((project) => {
            // Calculate spent based on linked parts
            const linkedPartsTotal = calculateProjectTotal(project.id, parts);
            const progress = project.budget > 0 ? (linkedPartsTotal / project.budget) * 100 : 0;
            const statusColors = getStatusColors(darkMode);
            const priorityColors = getPriorityColors(darkMode);

            return (
              <div
                key={project.id}
                data-project-id={project.id}
                onDragOver={(e) => handleDragOver(e, project)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, project)}
                onClick={() => {
                  setViewingProject(project);
                  setOriginalProjectData({ ...project }); // Save original data for unsaved changes check
                  setProjectModalEditMode(false);
                  setShowProjectDetailModal(true);
                }}
                className={`relative rounded-lg shadow-lg pt-3 pb-6 px-6 transition-[transform,box-shadow] duration-200 hover:shadow-2xl hover:scale-[1.03] cursor-pointer ${
                  draggedProject?.id === project.id
                    ? 'ring-2 ring-blue-500 ring-offset-2'
                    : dragOverProject?.id === project.id
                      ? (darkMode ? 'ring-2 ring-blue-500' : 'ring-2 ring-blue-400')
                      : ''
                } ${cardBg(darkMode)}`}
              >
                {/* Drag Handle - Hidden on touch devices */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    handleDragStart(e, project);
                    // Set the entire card as the drag image, positioned at top-left
                    const card = e.currentTarget.closest('[data-project-id]');
                    if (card) {
                      // Position the drag image so cursor is at the grip icon location (top-left area)
                      e.dataTransfer.setDragImage(card, 20, 20);
                    }
                  }}
                  onDragEnd={handleDragEnd}
                  className={`drag-handle absolute top-2 left-2 cursor-grab active:cursor-grabbing ${
                    darkMode ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Drag to reorder"
                >
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Vehicle Badge - Top Right */}
                {(() => {
                  const vehicle = project.vehicle_id ? vehicles.find(v => v.id === project.vehicle_id) : null;
                  return vehicle && (
                    <span
                      className={`absolute top-2 right-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                        darkMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-300'
                      }`}
                    >
                      <Car className="w-3 h-3 mr-1" />
                      <span style={{ color: vehicle.color || '#3B82F6' }}>
                        {vehicle.nickname || vehicle.name}
                      </span>
                    </span>
                  );
                })()}

                {/* Project Header */}
                <div className="mb-4 mt-8">
                  <div className="mb-2">
                    <h3 className={`text-xl font-bold ${primaryText(darkMode)}`}>
                      {project.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      statusColors[project.status]
                    } ${!darkMode ? 'ring-1 ring-inset ring-current' : ''}`}>
                      {project.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4 md:h-[3.75rem]">
                  <p className={`text-sm line-clamp-3 overflow-hidden ${
                    project.description
                      ? secondaryText(darkMode)
                      : (darkMode ? 'text-gray-500 italic' : 'text-gray-500 italic')
                  }`}
                  style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {project.description || 'No description added'}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <p className={`text-sm font-semibold mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-slate-700'
                  }`}>Budget</p>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      <span className={
                        progress > 90
                          ? (darkMode ? 'text-red-400' : 'text-red-600')
                          : progress > 70
                          ? (darkMode ? 'text-yellow-400' : 'text-yellow-600')
                          : (darkMode ? 'text-green-400' : 'text-green-600')
                      }>
                        ${linkedPartsTotal.toFixed(2)}
                      </span>
                      <span className={darkMode ? 'text-gray-300' : 'text-slate-700'}>
                        {' '}/ ${Math.round(project.budget || 0)}
                      </span>
                    </span>
                    <span className={`text-sm font-bold ${
                      darkMode ? 'text-gray-200' : 'text-gray-900'
                    }`}>
                      {progress.toFixed(0)}%
                    </span>
                  </div>
                  <div className={`w-full rounded-full h-3 ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <div
                      className={`h-3 rounded-full transition-all ${
                        progress > 90
                          ? 'bg-red-500'
                          : progress > 70
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Dates and Priority */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      darkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      Priority:
                    </span>
                    <span className={`text-sm font-bold ${priorityColors[project.priority]}`}>
                      {project.priority?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Parts Counter and Todos - Inline */}
                {(() => {
                  const linkedParts = parts.filter(part => part.projectId === project.id);
                  return (
                    <div className={`mt-4 pt-4 border-t flex items-center justify-between ${
                      darkMode ? 'border-gray-600' : 'border-gray-300'
                    }`}>
                      {/* Parts Counter */}
                      <div className="flex items-center gap-1.5">
                        <Package className={`w-4 h-4 ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                        <span className={`text-sm font-medium ${
                          darkMode ? 'text-gray-300' : 'text-slate-700'
                        }`}>
                          {linkedParts.length}
                        </span>
                      </div>

                      {/* Todo Counter */}
                      {project.todos && project.todos.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <CheckCircle className={`w-3.5 h-3.5 ${
                              darkMode ? 'text-green-400' : 'text-green-600'
                            }`} />
                            <span className={`text-xs font-medium ${
                              darkMode ? 'text-gray-300' : 'text-slate-700'
                            }`}>
                              {project.todos.filter(t => t.completed).length}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className={`w-3.5 h-3.5 ${
                              darkMode ? 'text-gray-400' : 'text-gray-500'
                            }`} />
                            <span className={`text-xs font-medium ${
                              darkMode ? 'text-gray-300' : 'text-slate-700'
                            }`}>
                              {project.todos.filter(t => !t.completed).length}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Empty State - Vehicle has no projects */}
        {projectVehicleFilter !== 'all' && projects.filter(project => !project.archived && String(project.vehicle_id) === String(projectVehicleFilter)).length === 0 && (
          <div className={`text-center py-12 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-slate-100'
          }`}>
            <Car className={`w-16 h-16 mx-auto mb-4 opacity-40 ${
              darkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <h3 className={`text-xl font-semibold mb-2 ${
              darkMode ? 'text-gray-300' : 'text-slate-700'
            }`}>
              Selected vehicle has no linked projects
            </h3>
            <p className={`${
              darkMode ? 'text-gray-400' : 'text-slate-600'
            }`}>
              Create a project or link an existing one to this vehicle
            </p>
          </div>
        )}

        {/* Empty State - No projects at all */}
        {projects.filter(p => !p.archived).length === 0 && (
          <div className={`text-center py-12 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-slate-100'
          }`}>
            <ListChecks className={`w-16 h-16 mx-auto mb-4 ${
              darkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <h3 className={`text-xl font-semibold mb-2 ${
              darkMode ? 'text-gray-300' : 'text-slate-700'
            }`}>
              No Active Projects
            </h3>
            <p className={`mb-4 ${
              darkMode ? 'text-gray-400' : 'text-slate-600'
            }`}>
              Start organizing your restoration by creating your first project
            </p>
            <button
              onClick={() => setShowAddProjectModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow-md transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add a project
            </button>
          </div>
        )}

        {/* Archived Projects Section */}
        <>
          <div className={`my-8 border-t ${
            darkMode ? 'border-gray-700' : 'border-slate-300'
          }`}>
            {/* Archive Drop Zone - appears when dragging an active project */}
            {draggedProject && !draggedProject.archived && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverProjectArchiveZone(true);
                }}
                onDragLeave={() => setDragOverProjectArchiveZone(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleProjectArchiveZoneDrop(true);
                }}
                className={`drag-handle mt-8 mb-6 p-6 rounded-lg border-2 border-dashed transition-all ${
                  dragOverProjectArchiveZone
                    ? darkMode
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-blue-600 bg-blue-100/50'
                    : darkMode
                      ? 'border-gray-600 bg-gray-800/50'
                      : 'border-gray-300 bg-gray-100/50'
                }`}
              >
                <p className={`text-center text-sm ${
                  dragOverProjectArchiveZone
                    ? darkMode ? 'text-blue-400' : 'text-blue-600'
                    : darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Drop here to archive
                </p>
              </div>
            )}

            <div
              className={`flex items-center gap-2 ${draggedProject && !draggedProject.archived ? '' : 'mt-8'} mb-6 cursor-pointer select-none transition-colors ${
                darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-slate-700 hover:text-slate-900'
              }`}
              onClick={() => {
                const wasCollapsed = isProjectArchiveCollapsed;
                setIsProjectArchiveCollapsed(!isProjectArchiveCollapsed);
                // If opening the archive, scroll to bottom of page after a brief delay to allow expansion
                if (wasCollapsed) {
                  setTimeout(() => {
                    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
                  }, 100);
                }
              }}
            >
              {isProjectArchiveCollapsed ? <FolderLock className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
              <h2 className="text-lg font-semibold">
                Archive
              </h2>
              <ChevronRight
                className={`w-5 h-5 transition-transform duration-300 ${
                  isProjectArchiveCollapsed ? '' : 'rotate-90'
                }`}
              />
            </div>
          </div>

          <div
            ref={projectArchiveRef}
            className={`transition-all duration-300 ease-in-out ${
              isProjectArchiveCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[5000px] opacity-100 overflow-visible'
            }`}
          >
            {projects.filter(p => p.archived).length > 0 ? (
              <>
                <div className="projects-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.filter(p => p.archived).map((project) => {
                  const vehicle = project.vehicle_id ? vehicles.find(v => v.id === project.vehicle_id) : null;
                  return (
                    <div
                      key={project.id}
                      onClick={() => {
                        setViewingProject(project);
                        setOriginalProjectData({ ...project });
                        setProjectModalEditMode(false);
                        setShowProjectDetailModal(true);
                      }}
                      className={`relative rounded-lg shadow-lg pt-2 px-3 transition-[transform,box-shadow] duration-200 hover:shadow-2xl hover:scale-[1.03] cursor-pointer ${
                        vehicle ? 'pb-8' : 'pb-2'
                      } ${
                        darkMode ? 'bg-gray-800' : 'bg-slate-100'
                      }`}
                    >
                      {/* Project Name */}
                      <h3 className={`text-base font-bold mb-1 ${
                        darkMode ? 'text-gray-100' : 'text-slate-800'
                      }`}>
                        {project.name}
                      </h3>

                      {/* Description */}
                      {project.description && (
                        <p className={`text-xs mb-2 line-clamp-2 ${
                          darkMode ? 'text-gray-400' : 'text-slate-600'
                        }`}>
                          {project.description}
                        </p>
                      )}

                      {/* Vehicle Badge - Bottom Right */}
                      {vehicle && (
                        <span
                          className={`absolute bottom-2 right-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-300 text-gray-700'
                          }`}
                        >
                          <Car className="w-3 h-3 mr-1" />
                          <span style={{ color: vehicle.color || '#3B82F6' }}>
                            {vehicle.nickname || vehicle.name}
                          </span>
                        </span>
                      )}
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

        {/* Add Project Modal */}
        <AddProjectModal
          isOpen={showAddProjectModal}
          darkMode={darkMode}
          newProject={newProject}
          setNewProject={setNewProject}
          vehicles={vehicles}
          showAddProjectVehicleDropdown={showAddProjectVehicleDropdown}
          setShowAddProjectVehicleDropdown={setShowAddProjectVehicleDropdown}
          isModalClosing={isModalClosing}
          handleCloseModal={handleCloseModal}
          addProject={addProject}
          onClose={() => {
            setShowAddProjectModal(false);
            // Reset form to initial state
            setNewProject({
              name: '',
              description: '',
              budget: '',
              priority: 'not_set',
              status: 'planning',
              vehicle_id: null
            });
          }}
          setConfirmDialog={setConfirmDialog}
        />

        {/* Project Detail Modal */}
        <ProjectDetailModal
          isOpen={showProjectDetailModal}
          darkMode={darkMode}
          viewingProject={viewingProject}
          setViewingProject={setViewingProject}
          projectModalEditMode={projectModalEditMode}
          setProjectModalEditMode={setProjectModalEditMode}
          originalProjectData={originalProjectData}
          setOriginalProjectData={setOriginalProjectData}
          isModalClosing={isModalClosing}
          projects={projects}
          parts={parts}
          vehicles={vehicles}
          vendorColors={vendorColors}
          editingTodoId={editingTodoId}
          setEditingTodoId={setEditingTodoId}
          editingTodoText={editingTodoText}
          setEditingTodoText={setEditingTodoText}
          newTodoText={newTodoText}
          setNewTodoText={setNewTodoText}
          handleCloseModal={handleCloseModal}
          hasUnsavedProjectChanges={hasUnsavedProjectChanges}
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
          calculateProjectStatus={calculateProjectStatus}
          setConfirmDialog={setConfirmDialog}
          setActiveTab={setActiveTab}
          archivePart={archivePart}
          onAddPart={onAddPartFromProject}
          setShowPartDetailModal={setShowPartDetailModal}
          setViewingPart={setViewingPart}
          onClose={() => {
            setShowProjectDetailModal(false);
            setViewingProject(null);
          }}
        />
      </>
    </div>
  );
};

export default ProjectsTab;
