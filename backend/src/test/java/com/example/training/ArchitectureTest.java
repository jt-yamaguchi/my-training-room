package com.example.training;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import jakarta.persistence.Entity;

/**
 * レイヤードアーキテクチャの依存方向を強制するテスト。
 * controller → service → repository の一方通行を破るとCIが失敗する。
 * AIが構成を崩したコードを生成した場合の機械的なガードレール。
 */
@AnalyzeClasses(packages = "com.example.training")
public class ArchitectureTest {

    @ArchTest
    static final ArchRule controllerはrepositoryを直接使わない =
            noClasses().that().haveSimpleNameEndingWith("Controller")
                    .should().dependOnClassesThat().haveSimpleNameEndingWith("Repository")
                    .because("ControllerはServiceを経由すること");

    @ArchTest
    static final ArchRule controllerはエンティティに依存しない =
            noClasses().that().haveSimpleNameEndingWith("Controller")
                    .should().dependOnClassesThat().areAnnotatedWith(Entity.class)
                    .because("APIの入出力は必ずDTOに変換すること");

    @ArchTest
    static final ArchRule repositoryはserviceからのみ使う =
            classes().that().haveSimpleNameEndingWith("Repository")
                    .should().onlyBeAccessed().byClassesThat().haveSimpleNameEndingWith("Service")
                    .because("Repositoryへのアクセスは Service レイヤーに集約すること");

    @ArchTest
    static final ArchRule serviceはcontrollerに依存しない =
            noClasses().that().haveSimpleNameEndingWith("Service")
                    .should().dependOnClassesThat().haveSimpleNameEndingWith("Controller")
                    .because("依存方向は controller → service の一方通行にすること");
}
