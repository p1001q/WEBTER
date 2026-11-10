package com.webter.domain.report.entity;

import java.util.EnumSet;
import java.util.Set;

public enum ReportReason {
	PHISHING_MALWARE,
	INAPPROPRIATE_CONTENT,
	UNREACHABLE,
	FALSE_INFORMATION,
	OWNERSHIP,
	SPAM_ADVERTISING,
	ABUSE,
	PERSONAL_INFORMATION,
	INAPPROPRIATE_EXPRESSION,
	SPAM_IMPERSONATION,
	OTHER;

	private static final Set<ReportReason> SERVICE_REASONS = EnumSet.of(
		PHISHING_MALWARE, INAPPROPRIATE_CONTENT, UNREACHABLE, FALSE_INFORMATION, OWNERSHIP, OTHER);
	private static final Set<ReportReason> CONTENT_REASONS = EnumSet.of(SPAM_ADVERTISING, ABUSE, PERSONAL_INFORMATION, OTHER);
	private static final Set<ReportReason> PROFILE_REASONS = EnumSet.of(
		INAPPROPRIATE_EXPRESSION, SPAM_IMPERSONATION, PERSONAL_INFORMATION, OTHER);

	public boolean appliesTo(ReportTargetType type) {
		return switch (type) {
			case SERVICE -> SERVICE_REASONS.contains(this);
			case REVIEW, REVIEW_REPLY, COMMENT -> CONTENT_REASONS.contains(this);
			case PROFILE -> PROFILE_REASONS.contains(this);
		};
	}
}
