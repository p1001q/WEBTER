package com.webter.domain.user.repository;

import com.webter.domain.user.entity.OAuthIdentity;
import com.webter.domain.user.entity.OAuthProvider;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OAuthIdentityRepository extends JpaRepository<OAuthIdentity, Long> {

	Optional<OAuthIdentity> findByProviderAndProviderSubject(OAuthProvider provider, String providerSubject);

}
