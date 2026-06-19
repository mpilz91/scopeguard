import { prisma } from "./db"

export type AuditAction =
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_REGISTER"
  | "ORG_CREATED"
  | "MEMBER_INVITED"
  | "MEMBER_REMOVED"
  | "CUSTOMER_CREATED"
  | "CUSTOMER_UPDATED"
  | "CUSTOMER_DELETED"
  | "ASSET_CREATED"
  | "ASSET_UPDATED"
  | "ASSET_DELETED"
  | "ASSESSMENT_CREATED"
  | "ASSESSMENT_UPDATED"
  | "ASSESSMENT_CANCELLED"
  | "ROE_CREATED"
  | "ROE_SENT"
  | "ROE_APPROVED"
  | "ROE_REJECTED"
  | "SCAN_JOB_CREATED"
  | "SCAN_JOB_STARTED"
  | "SCAN_JOB_COMPLETED"
  | "SCAN_JOB_FAILED"
  | "SCAN_JOB_CANCELLED"
  | "FINDING_CREATED"
  | "FINDING_UPDATED"
  | "REPORT_GENERATED"
  | "AGENT_TOKEN_CREATED"
  | "AGENT_TOKEN_REVOKED"
  | "ORGANIZATION_CREATED"
  | "ORGANIZATION_UPDATED"
  | "ORGANIZATION_DELETED"
  | "SERVICE_TYPE_CREATED"
  | "SERVICE_TYPE_UPDATED"
  | "SERVICE_TYPE_DELETED"
  | "CONTRACT_CREATED"
  | "CONTRACT_UPDATED"
  | "CONTRACT_DELETED"
  | "CLIENT_CREATED"
  | "HOST_PROMOTED_TO_ASSET"
  | "SCAN_TYPE_DEF_CREATED"
  | "SCAN_TYPE_DEF_UPDATED"
  | "SCAN_TYPE_DEF_DELETED"

export interface AuditParams {
  organizationId: string
  userId?: string
  action: AuditAction
  resource: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function audit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: params.metadata as any,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  } catch (err) {
    console.error("[AUDIT] Failed to write audit log:", err)
  }
}
