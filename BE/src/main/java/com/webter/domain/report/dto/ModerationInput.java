package com.webter.domain.report.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ModerationInput {

	private ModerationInput() {
	}

	public enum Decision {
		RESTORE, HIDE, DELETE, DISMISS
	}

	public enum Sanction {
		WARNING, REGISTRATION_RESTRICTED, SUSPENDED
	}

	public record Resolve(@NotNull Decision action, @NotBlank @Size(max = 1000) String reason) {
	}

	public record SanctionMember(@NotNull Sanction action, @NotBlank @Size(max = 1000) String reason) {
	}
}
