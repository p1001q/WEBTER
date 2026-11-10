package com.webter.domain.reaction.dto;

import com.webter.domain.review.entity.AuthorKind;
import com.webter.domain.user.entity.User;
import java.util.regex.Pattern;

public record InteractionAuthor(AuthorKind kind, String uid, String nick, String handle, String ip,
		boolean anonymous, boolean withdrawn) {

	private static final Pattern IPV4_PREFIX = Pattern.compile("^([0-9]{1,3}\\.[0-9]{1,3})(?:\\.|$)");

	public static InteractionAuthor member(User author, boolean anonymous) {
		boolean showProfile = !anonymous && author != null;
		return new InteractionAuthor(AuthorKind.MEMBER, showProfile ? author.getId().toString() : null,
			showProfile ? author.getPublicNickname() : null, showProfile ? author.getUsername() : null,
			null, anonymous, author == null);
	}

	public static InteractionAuthor guest(String partialIp) {
		String masked = null;
		if (partialIp != null) {
			var prefix = IPV4_PREFIX.matcher(partialIp);
			if (prefix.find()) {
				masked = prefix.group(1);
			}
		}
		return new InteractionAuthor(AuthorKind.GUEST, null, null, null, masked, false, false);
	}

}
