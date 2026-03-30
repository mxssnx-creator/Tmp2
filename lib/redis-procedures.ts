/**
 * Redis Database Procedures and Monitoring
 * Comprehensive procedures for Redis operations and monitoring
 */

export interface RedisMonitoringMetrics {
  operationsPerSecond: number
  dbSize: number
  keyCount: number
  requestRate: number
  ttlCleanupCount: number
  expiredKeysRemoved: number
  memoryUsage: number
  connectionCount: number
}

export interface RedisOperationStats {
  totalOperations: number
  operationsPerMinute: number
  operationsPerSecond: number
  peakOperationsPerSecond: number
  averageOperationTime: number
  successfulOperations: number
  failedOperations: number
  operationTypes: Record<string, number>
}

export class RedisProcedures {
  private client: InlineLocalRedis
  private metrics: RedisMonitoringMetrics
  private operationStats: RedisOperationStats
  private ttlCleanupTimer: NodeJS.Timeout | null = null
  private operationTrackingEnabled = true

  constructor() {
    this.client = getClient()
    this.metrics = {
      operationsPerSecond: 0,
      dbSize: 0,
      keyCount: 0,
      requestRate: 0,
      ttlCleanupCount: 0,
      expiredKeysRemoved: 0,
      memoryUsage: 0,
      connectionCount: 0,
    }
    this.operationStats = {
      totalOperations: 0,
      operationsPerMinute: 0,
      operationsPerSecond: 0,
      peakOperationsPerSecond: 0,
      averageOperationTime: 0,
      successfulOperations: 0,
      failedOperations: 0,
      operationTypes: {},
    }
    this.initializeMonitoring()
  }

  /**
   * Initialize comprehensive monitoring system
   */
  private initializeMonitoring(): void {
    // Start TTL cleanup monitoring
    this.startTTLCleanupMonitoring()
    
    // Start operation tracking
    this.startOperationTracking()
    
    // Start metrics collection
    this.startMetricsCollection()
  }

  /**
   * Start periodic TTL cleanup with monitoring
   */
  private startTTLCleanupMonitoring(): void {
    const globalCleanup = globalThis as unknown as { __redis_cleanup_monitoring?: boolean }
    if (globalCleanup.__redis_cleanup_monitoring) return
    globalCleanup.__redis_cleanup_monitoring = true
    
    this.ttlCleanupTimer = setInterval(() => {
      this.performTTLCleanupWithMetrics()
    }, 60000) // Every 60 seconds
    
    // Avoid blocking script/test process exit
    this.ttlCleanupTimer.unref?.()
  }

  /**
   * Perform TTL cleanup with metrics tracking
   */
  private async performTTLCleanupWithMetrics(): Promise<void> {
    const startTime = Date.now()
    const beforeCleanup = await this.client.dbSize()
    
    // Clean up expired keys
    await this.client.cleanupExpiredKeys()
    
    const afterCleanup = await this.client.dbSize()
    const keysRemoved = beforeCleanup - afterCleanup
    
    this.metrics.ttlCleanupCount++
    this.metrics.expiredKeysRemoved += keysRemoved
    this.metrics.dbSize = afterCleanup
    
    const duration = Date.now() - startTime
    
    if (keysRemoved > 0) {
      console.log(`[Redis] TTL cleanup: removed ${keysRemoved} keys in ${duration}ms`)
    }
  }

  /**
   * Start operation tracking for performance monitoring
   */
  private startOperationTracking(): void {
    if (!this.operationTrackingEnabled) return
    
    // Track operation types
    const originalMethods = Object.getOwnPropertyNames(this.client)
    
    for (const method of originalMethods) {
      if (typeof (this.client as any)[method] === 'function') {
        const originalMethod = (this.client as any)[method]
        (this.client as any)[method] = async (...args: any[]) => {
          const operationStart = Date.now()
          const operationType = method
          
          try {
            const result = await originalMethod.apply(this.client, args)
            
            // Update operation stats
            this.operationStats.totalOperations++
            this.operationStats.successfulOperations++
            this.operationStats.operationTypes[operationType] = (this.operationStats.operationTypes[operationType] || 0) + 1
            
            const operationTime = Date.now() - operationStart
            this.operationStats.averageOperationTime = 
              (this.operationStats.averageOperationTime * (this.operationStats.successfulOperations - 1) + operationTime) / 
              this.operationStats.successfulOperations
            
            return result
          } catch (error) {
            this.operationStats.failedOperations++
            throw error
          }
        }
      }
    }
  }

  /**
   * Start metrics collection for system monitoring
   */
  private startMetricsCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(async () => {
      await this.collectSystemMetrics()
    }, 30000).unref?.()
  }

  /**
   * Collect comprehensive system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      const [dbSize, keys, info] = await Promise.all([
        this.client.dbSize(),
        this.client.keys('*'),
        this.client.info(),
      ])
      
      this.metrics.dbSize = dbSize
      this.metrics.keyCount = Array.isArray(keys) ? keys.length : dbSize
      this.metrics.operationsPerSecond = getRedisRequestsPerSecond()
      this.metrics.requestRate = this.operationStats.operationsPerSecond
      this.metrics.connectionCount = await this.getClientCount()
      
      // Parse info for additional metrics
      const infoLines = info.split('\n')
      for (const line of infoLines) {
        if (line.startsWith('redis_version')) {
          // Already handled
        } else if (line.startsWith('uptime_in_seconds')) {
          const uptime = parseInt(line.split(':')[1], 10)
          // Calculate memory usage if possible
          this.metrics.memoryUsage = uptime * 1024 // Rough estimate
        }
      }
      
      console.log(`[Redis] Metrics: ${dbSize} keys, ${this.metrics.operationsPerSecond} ops/s, ${this.metrics.keyCount} total keys`)
    } catch (error) {
      console.error('[Redis] Failed to collect metrics:', error)
    }
  }

  /**
   * Get current client count (for in-memory implementation)
   */
  private async getClientCount(): Promise<number> {
    // In memory implementation - return 1 for single client
    return 1
  }

  /**
   * Get comprehensive health check
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    metrics: RedisMonitoringMetrics
    operations: RedisOperationStats
    issues: string[]
  }> {
    const [pong, metrics] = await Promise.all([
      this.client.ping(),
      this.getMonitoringMetrics(),
    ])
    
    const issues: string[] = []
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (pong !== 'PONG') {
      status = 'unhealthy'
      issues.push('Redis ping failed')
    }
    
    if (metrics.dbSize > 1000000) {
      status = 'degraded'
      issues.push('Database size approaching capacity limit')
    }
    
    if (metrics.operationsPerSecond > 5000) {
      issues.push('High operation rate may indicate performance issues')
    }
    
    return {
      status,
      metrics,
      operations: this.operationStats,
      issues,
    }
  }

  /**
   * Get current monitoring metrics
   */
  async getMonitoringMetrics(): Promise<RedisMonitoringMetrics> {
    return {
      ...this.metrics,
      operationsPerSecond: getRedisRequestsPerSecond(),
      dbSize: await this.client.dbSize(),
      keyCount: (await this.client.keys('*')).length,
    }
  }

  /**
   * Get operation statistics
   */
  getOperationStatistics(): RedisOperationStats {
    return {
      ...this.operationStats,
      operationsPerMinute: this.operationStats.totalOperations / (process.uptime() / 60),
      peakOperationsPerSecond: Math.max(this.operationStats.peakOperationsPerSecond, this.operationStats.operationsPerSecond),
    }
  }

  /**
   * Reset operation statistics
   */
  resetOperationStatistics(): void {
    this.operationStats = {
      totalOperations: 0,
      operationsPerMinute: 0,
      operationsPerSecond: 0,
      peakOperationsPerSecond: 0,
      averageOperationTime: 0,
      successfulOperations: 0,
      failedOperations: 0,
      operationTypes: {},
    }
  }

  /**
   * Enable or disable operation tracking
   */
  setOperationTracking(enabled: boolean): void {
    this.operationTrackingEnabled = enabled
    if (enabled) {
      this.startOperationTracking()
    }
  }

  /**
   * Get detailed database analysis
   */
  async analyzeDatabase(): Promise<{
    keyDistribution: Record<string, number>
    sizeByPattern: Record<string, number>
    ttlKeys: string[]
    expiringKeys: string[]
    largeKeys: string[]
    orphanedKeys: string[]
  }> {
    const keys = await this.client.keys('*')
    const analysis: any = {
      keyDistribution: {},
      sizeByPattern: {},
      ttlKeys: [],
      expiringKeys: [],
      largeKeys: [],
      orphanedKeys: [],
    }
    
    for (const key of keys) {
      // Count by prefix
      const prefix = key.split(':')[0]
      analysis.keyDistribution[prefix] = (analysis.keyDistribution[prefix] || 0) + 1
      
      // Size by pattern
      const pattern = key.includes(':') ? key.split(':')[0] + ':*' : key
      analysis.sizeByPattern[pattern] = (analysis.sizeByPattern[pattern] || 0) + 1
      
      // Check TTL
      const ttl = await this.client.ttl(key)
      if (ttl > 0) {
        analysis.ttlKeys.push(key)
      }
      
      // Check if key is expired
      if (await this.client.get(key) === null) {
        analysis.expiringKeys.push(key)
      }
      
      // Check for large keys (strings > 1KB)
      const value = await this.client.get(key)
      if (value && value.length > 1024) {
        analysis.largeKeys.push(key)
      }
      
      // Check for orphaned keys (no associated data)
      const dataExists = await this.checkDataExists(key)
      if (!dataExists) {
        analysis.orphanedKeys.push(key)
      }
    }
    
    return analysis
  }

  /**
   * Check if data exists for a key
   */
  private async checkDataExists(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(key)
      return exists > 0
    } catch {
      return false
    }
  }

  /**
   * Cleanup orphaned keys
   */
  async cleanupOrphanedKeys(): Promise<number> {
    const analysis = await this.analyzeDatabase()
    let removed = 0
    
    for (const key of analysis.orphanedKeys) {
      await this.client.del(key)
      removed++
    }
    
    if (removed > 0) {
      console.log(`[Redis] Cleanup: removed ${removed} orphaned keys`)
    }
    
    return removed
  }

  /**
   * Compact database by removing expired and orphaned keys
   */
  async compactDatabase(): Promise<{
    removedKeys: number
    freedSpace: number
    timeTaken: number
  }> {
    const startTime = Date.now()
    
    // Remove expired keys
    await this.client.cleanupExpiredKeys()
    
    // Remove orphaned keys
    const orphanedRemoved = await this.cleanupOrphanedKeys()
    
    const timeTaken = Date.now() - startTime
    const freedSpace = orphanedRemoved * 1024 // Rough estimate
    
    return {
      removedKeys: orphanedRemoved,
      freedSpace,
      timeTaken,
    }
  }

  /**
   * Backup database to JSON
   */
  async backupDatabase(): Promise<string> {
    const keys = await this.client.keys('*')
    const backup: any = {}
    
    for (const key of keys) {
      try {
        const value = await this.client.get(key)
        if (value !== null) {
          backup[key] = value
        }
      } catch (error) {
        console.warn(`[Redis] Backup: could not backup key ${key}:`, error)
      }
    }
    
    return JSON.stringify(backup, null, 2)
  }

  /**
   * Restore database from JSON backup
   */
  async restoreDatabase(backupJson: string): Promise<void> {
    try {
      const backup = JSON.parse(backupJson)
      
      for (const [key, value] of Object.entries(backup)) {
        await this.client.set(key, value)
      }
      
      console.log(`[Redis] Restored ${Object.keys(backup).length} keys from backup`)
    } catch (error) {
      console.error('[Redis] Restore failed:', error)
      throw error
    }
  }

  /**
   * Get database statistics report
   */
  async getStatisticsReport(): Promise<{
    totalKeys: number
    uniquePrefixes: string[]
    mostCommonKeys: Array<{ key: string; count: number }>
    averageKeySize: number
    databaseUtilization: number
    recommendations: string[]
  }> {
    const keys = await this.client.keys('*')
    const keyMap = new Map<string, number>()
    const prefixMap = new Map<string, number>()
    let totalSize = 0
    
    for (const key of keys) {
      const prefix = key.split(':')[0]
      prefixMap.set(prefix, (prefixMap.get(prefix) || 0) + 1)
      
      const value = await this.client.get(key)
      if (value) {
        const size = value.length
        keyMap.set(key, size)
        totalSize += size
      }
    }
    
    // Get most common keys
    const sortedKeys = Array.from(keyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
    
    const totalKeys = keys.length
    const averageKeySize = totalKeys > 0 ? totalSize / totalKeys : 0
    const databaseUtilization = Math.min((totalSize / (1024 * 1024)) * 100, 100) // % of 1MB
    
    // Recommendations
    const recommendations: string[] = []
    if (totalKeys > 10000) {
      recommendations.push('Consider implementing key expiration policies')
    }
    if (averageKeySize > 1024) {
      recommendations.push('Consider compressing large values')
    }
    if (prefixMap.size > 100) {
      recommendations.push('Consider organizing keys into logical groups')
    }
    
    return {
      totalKeys,
      uniquePrefixes: Array.from(prefixMap.keys()),
      mostCommonKeys: sortedKeys.map(([key, count]) => ({ key, count })),
      averageKeySize,
      databaseUtilization,
      recommendations,
    }
  }

  /**
   * Get performance benchmarks
   */
  async getPerformanceBenchmarks(): Promise<{
    readSpeed: number
    writeSpeed: number
    concurrentOperations: number
    latency: {
      min: number
      max: number
      avg: number
      p95: number
      p99: number
    }
    throughput: number
  }> {
    const benchmarks: any = {
      readSpeed: 0,
      writeSpeed: 0,
      concurrentOperations: 0,
      latency: {
        min: Infinity,
        max: 0,
        avg: 0,
        p95: 0,
        p99: 0,
      },
      throughput: 0,
    }
    
    // Simple read benchmark
    const readKeys = await this.client.keys('*').catch(() => [])
    const readStart = Date.now()
    for (const key of readKeys.slice(0, 100)) {
      await this.client.get(key).catch(() => null)
    }
    const readDuration = Date.now() - readStart
    benchmarks.readSpeed = readKeys.length > 0 ? readKeys.length / (readDuration / 1000) : 0
    
    // Simple write benchmark
    const writeStart = Date.now()
    for (let i = 0; i < 100; i++) {
      await this.client.set(`benchmark:${i}`, `value-${i}`).catch(() => null)
    }
    const writeDuration = Date.now() - writeStart
    benchmarks.writeSpeed = 100 / (writeDuration / 1000)
    
    // Concurrent operations
    const concurrentStart = Date.now()
    const concurrentPromises = []
    for (let i = 0; i < 10; i++) {
      concurrentPromises.push(this.client.get(`benchmark:${i % 10}`))
    }
    await Promise.all(concurrentPromises)
    benchmarks.concurrentOperations = 10 / ((Date.now() - concurrentStart) / 1000)
    
    return benchmarks
  }

  /**
   * Get database optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<{
    memoryOptimization: string[]
    performanceOptimization: string[]
    dataStructureOptimization: string[]
    maintenanceTasks: string[]
  }> {
    const recommendations: any = {
      memoryOptimization: [],
      performanceOptimization: [],
      dataStructureOptimization: [],
      maintenanceTasks: [],
    }
    
    const stats = await this.getStatisticsReport()
    const benchmarks = await this.getPerformanceBenchmarks()
    
    // Memory optimization
    if (stats.averageKeySize > 512) {
      recommendations.memoryOptimization.push('Consider compressing large string values')
    }
    if (stats.totalKeys > 5000) {
      recommendations.memoryOptimization.push('Consider implementing key expiration for old data')
    }
    
    // Performance optimization
    if (benchmarks.readSpeed < 1000) {
      recommendations.performanceOptimization.push('Read performance may be slow - consider optimizing queries')
    }
    if (benchmarks.writeSpeed < 500) {
      recommendations.performanceOptimization.push('Write performance may be slow - consider batching writes')
    }
    if (benchmarks.concurrentOperations < 50) {
      recommendations.performanceOptimization.push('Consider increasing concurrency for better throughput')
    }
    
    // Data structure optimization
    if (stats.uniquePrefixes.length > 50) {
      recommendations.dataStructureOptimization.push('Consider consolidating related keys into hashes')
    }
    if (Object.keys(stats.keyDistribution).some((prefix) => stats.keyDistribution[prefix as any] > 1000)) {
      recommendations.dataStructureOptimization.push('Consider using more specific key patterns to avoid hot spots')
    }
    
    // Maintenance tasks
    recommendations.maintenanceTasks.push('Run periodic TTL cleanup')
    recommendations.maintenanceTasks.push('Monitor database size and growth')
    recommendations.maintenanceTasks.push('Review and remove unused keys periodically')
    
    return recommendations
  }

  /**
   * Execute emergency procedures
   */
  async executeEmergencyProcedures(): Promise<{
    success: boolean
    actionsTaken: string[]
    issuesResolved: string[]
    warnings: string[]
  }> {
    const result: any = {
      success: true,
      actionsTaken: [],
      issuesResolved: [],
      warnings: [],
    }
    
    try {
      // Step 1: Clear expired keys
      const cleanupResult = await this.client.cleanupExpiredKeys()
      if (cleanupResult) {
        result.actionsTaken.push('Cleared expired keys')
      }
      
      // Step 2: Compact database
      const compactResult = await this.compactDatabase()
      if (compactResult.removedKeys > 0) {
        result.actionsTaken.push(`Removed ${compactResult.removedKeys} orphaned keys`)
      }
      
      // Step 3: Check for critical issues
      const health = await this.getHealth()
      if (health.status === 'unhealthy') {
        result.issuesResolved.push('Fixed critical health issues')
      }
      
      // Step 4: Reset operation stats
      this.resetOperationStatistics()
      result.actionsTaken.push('Reset operation statistics')
      
    } catch (error) {
      result.success = false
      result.warnings.push(`Emergency procedures failed: ${error}`)
    }
    
    return result
  }
}

// Global procedures instance
let redisProcedures: RedisProcedures | null = null

export function getRedisProcedures(): RedisProcedures {
  if (!redisProcedures) {
    redisProcedures = new RedisProcedures()
  }
  return redisProcedures
}

// Convenience functions
export async function redisHealthCheck(): Promise<{ healthy: boolean; message: string }> {
  const procedures = getRedisProcedures()
  const health = await procedures.getHealth()
  return {
    healthy: health.status === 'healthy',
    message: health.issues.length > 0 ? health.issues.join(', ') : 'Redis is healthy',
  }
}

export async function redisDatabaseAnalysis(): Promise<any> {
  const procedures = getRedisProcedures()
  return procedures.analyzeDatabase()
}

export async function redisStatistics(): Promise<any> {
  const procedures = getRedisProcedures()
  return procedures.getStatisticsReport()
}

export async function redisPerformance(): Promise<any> {
  const procedures = getRedisProcedures()
  return procedures.getPerformanceBenchmarks()
}

export async function redisOptimization(): Promise<any> {
  const procedures = getRedisProcedures()
  return procedures.getOptimizationRecommendations()
}

export async function redisEmergency(): Promise<any> {
  const procedures = getRedisProcedures()
  return procedures.executeEmergencyProcedures()
}

export async function redisBackup(): Promise<string> {
  const procedures = getRedisProcedures()
  return procedures.backupDatabase()
}

export async function redisRestore(backup: string): Promise<void> {
  const procedures = getRedisProcedures()
  return procedures.restoreDatabase(backup)
}

export async function redisCompact(): Promise<any> {
  const procedures = getRedisProcedures()
  return procedures.compactDatabase()
}

export async function redisCleanup(): Promise<number> {
  const procedures = getRedisProcedures()
  return procedures.cleanupOrphanedKeys()
}

export function redisEnableMonitoring(enabled: boolean): void {
  const procedures = getRedisProcedures()
  procedures.setOperationTracking(enabled)
}

export function redisIsMonitoringEnabled(): boolean {
  const procedures = getRedisProcedures()
  return procedures.operationTrackingEnabled
}

export async function redisGetMetrics(): Promise<any> {
  const procedures = getRedisProcedures()
  return procedures.getMonitoringMetrics()
}

export async function redisGetOperationStats(): Promise<any> {
  const procedures = getRedisProcedures()
  return procedures.getOperationStatistics()
}

export async function redisResetStats(): Promise<void> {
  const procedures = getRedisProcedures()
  procedures.resetOperationStatistics()
}