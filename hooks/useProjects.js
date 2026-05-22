import { useState } from 'react';
import * as projectsService from '../services/projectsService';
import { validateBudget } from '../utils/validationUtils';
import { getDemoProjects, saveDemoProjects } from '../data/demoData';

/**
 * Custom hook for managing projects data and CRUD operations
 *
 * Features:
 * - Load projects from Supabase (or localStorage in demo mode)
 * - Add, update, and delete projects
 * - Auto-calculate project status based on todos
 * - Update project display order (for drag and drop)
 * - Helper functions for vehicle-project relationships
 *
 * @param {string} userId - Current user's ID for data isolation
 * @param {Object} toast - Toast notification functions { error, success, warning, info }
 * @param {boolean} isDemo - Whether in demo mode (uses localStorage instead of Supabase)
 * @returns {Object} Projects state and operations
 */
const useProjects = (userId, toast, isDemo = false) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    budget: '',
    priority: 'not_set',
    status: 'planning',
    vehicle_id: null
  });

  /**
   * Load projects from Supabase (or localStorage in demo mode)
   */
  const loadProjects = async () => {
    if (!userId) return;

    // Demo mode: load from localStorage
    if (isDemo) {
      const demoProjects = getDemoProjects();
      setProjects(demoProjects);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await projectsService.getAllProjects(userId);

      if (data && data.length > 0) {
        setProjects(data);
      } else {
        setProjects([]);
      }
    } catch (error) {
      // Error loading projects - silent fail
    } finally {
      setLoading(false);
    }
  };

  /**
   * Helper function to calculate project status based on todos
   */
  const calculateProjectStatus = (todos, currentStatus, linkedParts = []) => {
    // If status is manually set to "on_hold", keep it
    if (currentStatus === 'on_hold') return 'on_hold';
    const completedCount = todos && todos.length > 0 ? todos.filter(todo => todo.completed).length : 0;
    const totalCount = todos ? todos.length : 0;
    // Todo-based transitions take priority once work has started
    if (completedCount > 0) {
      return completedCount === totalCount ? 'completed' : 'in_progress';
    }
    // No todos started — derive status from linked parts
    if (linkedParts.length > 0) {
      return linkedParts.every(p => p.delivered) ? 'ready' : 'sourcing';
    }
    return 'planning';
  };

  /**
   * Add a new project
   * @param {Object} projectData - Project data to create
   * @param {Object} options - Options for the operation
   * @param {boolean} options.skipReload - Skip reloading projects after creation
   * @returns {Object|null} The created project, or null on error
   */
  const addProject = async (projectData, { skipReload = false } = {}) => {
    if (!userId) return null;

    // Validate budget
    const budgetValidation = validateBudget(projectData.budget, toast);
    if (!budgetValidation.isValid) {
      return null; // Toast already shown by validateBudget
    }

    // Demo mode: save to localStorage
    if (isDemo) {
      const demoProjects = getDemoProjects();
      const newProject = {
        id: `demo-project-${Date.now()}`,
        name: projectData.name,
        description: projectData.description,
        status: projectData.status || 'planning',
        budget: budgetValidation.value,
        spent: 0,
        priority: projectData.priority || 'medium',
        vehicle_id: projectData.vehicle_id || null,
        todos: [],
        user_id: userId,
        created_at: new Date().toISOString(),
        display_order: demoProjects.length
      };
      saveDemoProjects([...demoProjects, newProject]);
      if (!skipReload) setProjects([...demoProjects, newProject]);
      return newProject;
    }

    try {
      const data = await projectsService.createProject({
        name: projectData.name,
        description: projectData.description,
        status: projectData.status || 'planning',
        budget: budgetValidation.value,
        spent: 0,
        priority: projectData.priority || 'medium',
        vehicle_id: projectData.vehicle_id || null,
        todos: []
      }, userId);
      if (!skipReload) await loadProjects();
      return data?.[0] || null;
    } catch (error) {
      toast?.error('Error adding project');
      return null;
    }
  };

  /**
   * Update a project with optimistic updates for snappy UI
   */
  const updateProject = async (projectId, updates) => {
    // Auto-calculate status based on todos only when status is not explicitly set
    if (updates.todos && updates.status === undefined) {
      const currentProject = projects.find(p => p.id === projectId);
      updates.status = calculateProjectStatus(updates.todos, currentProject?.status);
    }

    // Optimistic update: update local state immediately
    const updatedProjects = projects.map(project =>
      project.id === projectId
        ? { ...project, ...updates }
        : project
    );
    setProjects(updatedProjects);

    // Demo mode: save to localStorage
    if (isDemo) {
      saveDemoProjects(updatedProjects);
      return;
    }

    // Persist to database in background
    try {
      await projectsService.updateProject(projectId, updates);
    } catch (error) {
      // On error, reload from database to get true state
      toast?.error('Error updating project');
      await loadProjects();
    }
  };

  /**
   * Delete a project
   */
  const deleteProject = async (projectId) => {
    // Demo mode: delete from localStorage
    if (isDemo) {
      const demoProjects = getDemoProjects();
      const updatedProjects = demoProjects.filter(p => p.id !== projectId);
      saveDemoProjects(updatedProjects);
      setProjects(updatedProjects);
      return;
    }

    try {
      await projectsService.deleteProject(projectId);
      await loadProjects();
    } catch (error) {
      toast?.error('Error deleting project');
    }
  };

  /**
   * Update projects display order
   */
  const updateProjectsOrder = async (orderedProjects) => {
    // Demo mode: save to localStorage
    if (isDemo) {
      const updatedProjects = orderedProjects.map((project, index) => ({
        ...project,
        display_order: index
      }));
      saveDemoProjects(updatedProjects);
      setProjects(updatedProjects);
      return;
    }

    try {
      // Update each project with its new display order
      for (let i = 0; i < orderedProjects.length; i++) {
        await projectsService.updateProjectDisplayOrder(orderedProjects[i].id, i);
      }
    } catch (error) {
      // Error updating project order - silent fail
    }
  };

  /**
   * Get projects for a specific vehicle
   */
  const getVehicleProjects = (vehicleId) => {
    return projects.filter(project => project.vehicle_id === vehicleId && !project.archived);
  };

  /**
   * Get project count for a specific vehicle
   */
  const getVehicleProjectCount = (vehicleId) => {
    return projects.filter(project => project.vehicle_id === vehicleId).length;
  };

  return {
    // State
    projects,
    setProjects,
    loading,
    newProject,
    setNewProject,

    // Operations
    loadProjects,
    addProject,
    updateProject,
    deleteProject,
    updateProjectsOrder,
    calculateProjectStatus,

    // Helper functions
    getVehicleProjects,
    getVehicleProjectCount
  };
};

export default useProjects;
