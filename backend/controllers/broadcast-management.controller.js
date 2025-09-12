const BroadcastManagementService = require('../services/broadcast-management.service');
const { NotFoundError, BadRequestError } = require('../utils/errors');

/**
 * Get all broadcasts for admin management
 */
const getAllBroadcasts = async (req, res, next) => {
  try {
    console.log('[Broadcast Management Controller] Getting all broadcasts for admin');
    
    const { page = 1, limit = 50, search, priority, status } = req.query;
    
    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      search: search?.trim(),
      priority,
      status
    };

    const result = await BroadcastManagementService.getAllBroadcasts(filters);

    res.status(200).json({
      success: true,
      broadcasts: result.broadcasts,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('[Broadcast Management Controller] Error getting broadcasts:', error);
    next(error);
  }
};

/**
 * Archive a broadcast
 */
const archiveBroadcast = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    console.log(`[Broadcast Management Controller] Archiving broadcast ${id} by admin ${adminId}`);

    const broadcast = await BroadcastManagementService.archiveBroadcast(id, adminId);

    res.status(200).json({
      success: true,
      message: 'Broadcast archived successfully',
      broadcast
    });

  } catch (error) {
    console.error('[Broadcast Management Controller] Error archiving broadcast:', error);
    next(error);
  }
};

/**
 * Restore an archived or reported broadcast
 */
const restoreBroadcast = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    console.log(`[Broadcast Management Controller] Restoring broadcast ${id} by admin ${adminId}`);

    const broadcast = await BroadcastManagementService.restoreBroadcast(id, adminId);

    res.status(200).json({
      success: true,
      message: 'Broadcast restored successfully',
      broadcast
    });

  } catch (error) {
    console.error('[Broadcast Management Controller] Error restoring broadcast:', error);
    next(error);
  }
};

/**
 * Delete a broadcast
 */
const deleteBroadcast = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    console.log(`[Broadcast Management Controller] Deleting broadcast ${id} by admin ${adminId}`);

    await BroadcastManagementService.deleteBroadcast(id, adminId);

    res.status(200).json({
      success: true,
      message: 'Broadcast deleted successfully'
    });

  } catch (error) {
    console.error('[Broadcast Management Controller] Error deleting broadcast:', error);
    next(error);
  }
};

module.exports = {
  getAllBroadcasts,
  archiveBroadcast,
  restoreBroadcast,
  deleteBroadcast
};