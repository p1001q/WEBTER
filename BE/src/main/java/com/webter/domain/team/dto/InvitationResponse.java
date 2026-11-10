package com.webter.domain.team.dto;

import com.webter.domain.team.entity.InvitationStatus;

public record InvitationResponse(String id, String serviceId, InvitationStatus status) {
}
